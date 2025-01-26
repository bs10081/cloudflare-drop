import { Context } from 'hono'
import mine from 'mime'
import { createId, init } from '@paralleldrive/cuid2'
import { z } from 'zod'
import dayjs, { ManipulateType } from 'dayjs'
import { inArray } from 'drizzle-orm'

import { Endpoint } from '../endpoint'
import { files, InsertFileType, StorageType } from '../../data/schemas'

const duration = ['day', 'week', 'month', 'year', 'hour', 'minute']

function resolveDuration(str: string): [number, ManipulateType] {
  const match = new RegExp(`^(\\d+)(${duration.join('|')})$`).exec(str)
  if (!match) {
    return [1, 'hour']
  }
  return [Number.parseInt(match[1], 10), match[2] as ManipulateType]
}

async function sha1(data: ArrayBuffer) {
  const digest = await crypto.subtle.digest(
    {
      name: 'SHA-1',
    },
    data,
  )
  const array = Array.from(new Uint8Array(digest))
  return array.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export class FileCreate extends Endpoint {
  schema = {
    responses: {
      '200': {
        description: 'Returns the file info',

        content: {
          'application/json': {
            schema: z.object({
              hash: z.string(),
            }),
          },
        },
      },
    },
  }

  async handle(c: Context) {
    let data: ArrayBuffer | null = null
    let filename: string
    let type: string | null
    let size: number = 0
    const contentType = c.req.header('Content-Type')
    if (
      contentType?.startsWith('multipart/form-data') ||
      contentType?.startsWith('application/x-www-form-urlencoded')
    ) {
      const formData = await c.req.formData()
      const file = formData.get('file') as File
      data = await file.arrayBuffer()
      filename = file.name
      type = file.type ?? mine.getType(filename) ?? 'text/plain'
      size = file.size
    } else {
      const blob = await c.req.blob()
      data = await blob.arrayBuffer()
      filename = (blob as File)?.name ?? ''
      type = blob.type
      size = blob.size
    }

    if (!data || data.byteLength === 0) {
      return this.error('分享內容為空')
    }

    const maxFileSize = Number.parseInt(c.env.MAX_FILE_SIZE ?? '100', 10)
    const kvSizeLimit = Number.parseInt(c.env.KV_SIZE_LIMIT ?? '25', 10)

    if (size > maxFileSize * 1024 * 1024) {
      return this.error(`檔案大於 ${maxFileSize}MB`)
    }

    const key = createId()
    const hash = await sha1(data)

    // 根據文件大小決定存儲位置
    const storageType = size > kvSizeLimit * 1024 * 1024 ? StorageType.R2 : StorageType.KV

    // 存儲文件
    if (storageType === StorageType.KV) {
      const kv = this.getKV(c)
      await kv.put(key, data)
    } else {
      const r2 = c.env.FILE_STORAGE
      await r2.put(key, data, {
        customMetadata: {
          filename,
          type,
          hash,
        },
      })
    }

    const db = this.getDB(c)

    const shareCodeCreate = init({
      length: 6,
    })

    const shareCodes: Array<string> = new Array(10).fill(
      shareCodeCreate().toUpperCase(),
    )

    const records = (
      await db
        .select({
          code: files.code,
        })
        .from(files)
        .where(inArray(files.code, shareCodes))
    ).map((d) => d.code)

    const shareCode = shareCodes.find((d) => !records.includes(d))

    if (!shareCode) {
      return this.error('分享碼產生失敗，請重試')
    }

    const [due, dueType] = resolveDuration(c.env.SHARE_DURATION)
    const dueDate = dayjs().add(due, dueType).toDate()

    const insert: InsertFileType = {
      objectId: key,
      filename,
      type,
      hash,
      code: shareCode,
      due_date: dueDate,
      storage_type: storageType,
    }

    const [record] = await db.insert(files).values(insert).returning({
      hash: files.hash,
      code: files.code,
      due_date: files.due_date,
    })

    return {
      message: 'ok',
      result: true,
      data: record,
    }
  }
}
