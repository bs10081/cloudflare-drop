import { eq, lt } from 'drizzle-orm'
import { files } from '../data/schemas'
import dayjs from 'dayjs'

export async function scheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext,
) {
  const now = dayjs().toDate()
  const db = env.DB

  // 查詢過期的檔案
  const expiredFiles = await db
    .select({
      id: files.id,
      objectId: files.objectId,
      storage_type: files.storage_type,
    })
    .from(files)
    .where(lt(files.due_date, now))

  // 批次刪除
  for (const file of expiredFiles) {
    try {
      // 根據儲存類型刪除檔案
      if (file.storage_type === 'kv') {
        await env.file_drops.delete(file.objectId)
      } else if (file.storage_type === 'r2') {
        await env.FILE_BUCKET.delete(file.objectId)
      }

      // 從資料庫中刪除記錄
      await db.delete(files).where(eq(files.id, file.id))
      
      console.log(`已刪除過期檔案: ${file.objectId}, 儲存類型: ${file.storage_type}`)
    } catch (error) {
      console.error(`刪除檔案失敗: ${file.objectId}`, error)
    }
  }
}
