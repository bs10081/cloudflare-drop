import { eq, lt } from 'drizzle-orm'
import dayjs from 'dayjs'
import { files } from '../data/schemas/files.schema'

export default {
  async scheduled(event: ScheduledEvent, env: ExecutionContext) {
    console.log('開始清理過期檔案')

    const db = env.DB
    const kv = env.KV

    // 查詢過期的檔案
    const expiredFiles = await db
      .select()
      .from(files)
      .where(lt(files.due_date, dayjs().unix()))

    console.log(`找到 ${expiredFiles.length} 個過期檔案`)

    // 刪除過期的檔案
    for (const file of expiredFiles) {
      try {
        // 刪除 KV 中的檔案
        await kv.delete(file.hash)
        console.log(`已刪除 KV 檔案：${file.hash}`)

        // 刪除資料庫中的檔案記錄
        await db.delete(files).where(eq(files.id, file.id))
        console.log(`已刪除資料庫記錄：${file.id}`)
      } catch (error) {
        console.error(`刪除檔案時發生錯誤：${error}`)
      }
    }

    console.log('清理完成')
  },
}
