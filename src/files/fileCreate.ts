import { Context } from 'hono'
import mine from 'mime'
import { createId } from '@paralleldrive/cuid2'
import { z } from 'zod'
import dayjs, { ManipulateType } from 'dayjs'
import { inArray } from 'drizzle-orm'

import { Endpoint } from '../endpoint'
import { files, InsertFileType } from '../../data/schemas'

function resolveDuration(str: string): [number, ManipulateType] {
  const duration = ['day', 'week', 'month', 'year', 'hour', 'minute']
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
    try {
      console.log('開始處理檔案上傳請求')
      let data: ArrayBuffer | null = null
      let filename: string = 'untitled'
      let type: string | null = null
      let size: number = 0
      const contentType = c.req.header('Content-Type')
      console.log('Content-Type:', contentType)

      try {
        if (
          contentType?.startsWith('multipart/form-data') ||
          contentType?.startsWith('application/x-www-form-urlencoded')
        ) {
          console.log('使用 formData 處理檔案')
          const formData = await c.req.formData()
          const file = formData.get('file')
          console.log('formData file:', file ? '存在' : '不存在', 
            file instanceof Blob ? '是 Blob' : '不是 Blob',
            file instanceof File ? '是 File' : '不是 File')
          
          if (!file || !(file instanceof Blob)) {
            return this.error('無效的檔案')
          }
          data = await file.arrayBuffer()
          if (file instanceof File) {
            filename = file.name || filename
          }
          type = file.type || mine.getType(filename) || 'application/octet-stream'
          size = file.size
          console.log('檔案資訊:', { filename, type, size })
        } else {
          console.log('使用 blob 處理檔案')
          const blob = await c.req.blob()
          data = await blob.arrayBuffer()
          if (blob instanceof File) {
            filename = blob.name || filename
          }
          type = blob.type || 'application/octet-stream'
          size = blob.size
          console.log('檔案資訊:', { filename, type, size })
        }
      } catch (err) {
        console.error('檔案處理錯誤:', err)
        return this.error('檔案處理失敗')
      }

      if (!data || data.byteLength === 0) {
        console.error('檔案內容為空')
        return this.error('分享內容為空')
      }

      const envMax = Number.parseInt(c.env.SHARE_MAX_SIZE_IN_MB, 10)
      const kvLimit = Math.min((envMax || 10), 25) * 1024 * 1024 // 不能超過 25MB
      console.log('檔案大小限制:', { envMax, kvLimit, actualSize: size })
      
      if (size > kvLimit) {
        return this.error(`檔案大於 ${kvLimit / 1024 / 1024}MB，請使用分片上傳功能`)
      }

      try {
        console.log('開始儲存檔案')
        const kv = this.getKV(c)
        const key = createId()
        console.log('準備寫入 KV，key:', key)
        
        try {
          await kv.put(key, data)
          console.log('KV 寫入成功')
        } catch (kvErr) {
          console.error('KV 寫入失敗:', kvErr)
          return this.error('檔案儲存失敗 (KV)')
        }

        const hash = await sha1(data)
        console.log('檔案雜湊值:', hash)

        console.log('開始資料庫操作')
        const db = this.getDB(c)
        const shareCodeCreate = createId.init({
          length: 6,
        })

        const shareCodes: Array<string> = new Array(10).fill(
          shareCodeCreate().toUpperCase(),
        )
        console.log('產生的分享碼:', shareCodes)

        const records = (
          await db
            .select({
              code: files.code,
            })
            .from(files)
            .where(inArray(files.code, shareCodes))
        ).map((d) => d.code)
        console.log('已存在的分享碼:', records)

        const shareCode = shareCodes.find((d) => !records.includes(d))
        console.log('選擇的分享碼:', shareCode)

        if (!shareCode) {
          return this.error('分享碼產生失敗，請重試')
        }

        const [due, dueType] = resolveDuration(c.env.SHARE_DURATION)
        const dueDate = dayjs().add(due, dueType).toDate()
        console.log('到期時間設定:', { due, dueType, dueDate })

        const insert: InsertFileType = {
          objectId: key,
          filename,
          type,
          hash,
          code: shareCode,
          due_date: dueDate,
          size,
          storage_type: 'kv',
        }
        console.log('準備寫入資料庫:', insert)

        try {
          const [record] = await db.insert(files).values(insert).returning({
            hash: files.hash,
            code: files.code,
            due_date: files.due_date,
          })
          console.log('資料庫寫入成功:', record)
          return this.success(record)
        } catch (dbErr) {
          console.error('資料庫寫入失敗:', dbErr)
          return this.error('檔案儲存失敗 (DB)')
        }
      } catch (err) {
        console.error('檔案儲存錯誤:', err)
        return this.error('檔案儲存失敗')
      }
    } catch (err) {
      console.error('未預期的錯誤:', err)
      return this.error('系統錯誤')
    }
  }
}
