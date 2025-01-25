import { Context } from 'hono'
import { z } from 'zod'
import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import { Endpoint } from '../endpoint'
import { chunks, files, InsertFileType } from '../../data/schemas'
import dayjs from 'dayjs'

export class FileChunkCreate extends Endpoint {
  schema = {
    request: {
      query: z.object({
        filename: z.string(),
        totalSize: z.number(),
        chunkNumber: z.number(),
        totalChunks: z.number(),
        uploadId: z.string().optional(),
      }),
    },
  }

  private async initializeUpload(c: Context, filename: string, totalSize: number) {
    const fileId = createId()
    const uploadId = await c.env.FILE_BUCKET.createMultipartUpload(fileId)
    
    const db = this.getDB(c)
    const [due, dueType] = this.resolveDuration(c.env.SHARE_DURATION)
    const dueDate = dayjs().add(due, dueType).toDate()

    const insert: InsertFileType = {
      objectId: fileId,
      filename,
      type: 'application/octet-stream',
      hash: '', // 完成後計算
      code: this.generateShareCode(),
      due_date: dueDate,
      size: totalSize,
      storage_type: 'r2',
    }

    await db.insert(files).values(insert)

    return { fileId, uploadId }
  }

  async handle(c: Context) {
    const data = await this.getValidatedData<typeof this.schema>()
    const { filename, totalSize, chunkNumber, totalChunks } = data.query
    const formData = await c.req.formData()
    const chunk = formData.get('chunk') as File

    if (!chunk) {
      return this.error('分片內容為空')
    }

    const db = this.getDB(c)
    let uploadId = data.query.uploadId
    let fileId: string

    // 初始化上傳
    if (chunkNumber === 1 && !uploadId) {
      const envMax = Number.parseInt(c.env.SHARE_MAX_SIZE_IN_MB, 10)
      const kvLimit = Math.min((envMax || 10), 25) * 1024 * 1024 // 不能超過 25MB
      if (totalSize <= kvLimit) {
        return this.error(`檔案大小小於等於 ${kvLimit / 1024 / 1024}MB，請使用一般上傳`)
      }

      const result = await this.initializeUpload(c, filename, totalSize)
      fileId = result.fileId
      uploadId = result.uploadId
    } else if (!uploadId) {
      return this.error('上傳 ID 不存在')
    }

    // 上傳分片
    const [existingFile] = await db
      .select()
      .from(files)
      .where(eq(files.objectId, fileId))
    
    if (!existingFile) {
      return this.error('檔案不存在')
    }

    const chunkBuffer = await chunk.arrayBuffer()
    await c.env.FILE_BUCKET.uploadPart(
      existingFile.objectId,
      uploadId,
      chunkNumber,
      chunkBuffer,
    )

    // 記錄分片狀態
    await db.insert(chunks).values({
      fileId: existingFile.id,
      chunkNumber,
      totalChunks,
      size: chunk.size,
      uploadId,
      status: 'completed',
    })

    // 檢查是否所有分片都已上傳
    const uploadedChunks = await db
      .select()
      .from(chunks)
      .where(eq(chunks.fileId, existingFile.id))

    if (uploadedChunks.length === totalChunks) {
      // 完成上傳
      await c.env.FILE_BUCKET.completeMultipartUpload(
        existingFile.objectId,
        uploadId,
      )

      // 計算完整檔案的 SHA1
      const completeFile = await c.env.FILE_BUCKET.get(existingFile.objectId)
      if (!completeFile) {
        return this.error('檔案上傳失敗')
      }
      
      const fileBuffer = await completeFile.arrayBuffer()
      const hash = await this.calculateSHA1(fileBuffer)

      // 更新檔案雜湊值
      await db
        .update(files)
        .set({ hash })
        .where(eq(files.id, existingFile.id))

      return this.success({
        hash,
        code: existingFile.code,
        due_date: existingFile.due_date,
      })
    }

    return this.success({
      uploadId,
      chunkNumber,
    })
  }

  private async calculateSHA1(data: ArrayBuffer) {
    const digest = await crypto.subtle.digest(
      {
        name: 'SHA-1',
      },
      data,
    )
    const array = Array.from(new Uint8Array(digest))
    return array.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  private generateShareCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('')
  }

  private resolveDuration(str: string): [number, dayjs.ManipulateType] {
    const duration = ['day', 'week', 'month', 'year', 'hour', 'minute']
    const match = new RegExp(`^(\\d+)(${duration.join('|')})$`).exec(str)
    if (!match) {
      return [1, 'hour']
    }
    return [Number.parseInt(match[1], 10), match[2] as dayjs.ManipulateType]
  }
} 