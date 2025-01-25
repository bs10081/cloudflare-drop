import { z } from 'zod'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from 'drizzle-zod'
import { createId } from '@paralleldrive/cuid2'

export const files = sqliteTable('files', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  objectId: text('object_id').notNull(), // 檔案 id
  filename: text('filename'), // 檔案名稱
  type: text('type'), // 類型
  hash: text('hash').notNull(), // hash 值
  code: text('code').notNull().unique(), // 分享碼
  due_date: integer('due_date', { mode: 'timestamp' }).notNull(), // 過期時間
  size: integer('size').notNull(), // 檔案大小
  storage_type: text('storage_type').notNull().default('kv'), // 儲存類型：kv 或 r2
})

// 分片上傳資料表
export const chunks = sqliteTable('chunks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  fileId: text('file_id').notNull(), // 關聯的檔案 ID
  chunkNumber: integer('chunk_number').notNull(), // 分片編號
  totalChunks: integer('total_chunks').notNull(), // 總分片數
  size: integer('size').notNull(), // 分片大小
  uploadId: text('upload_id').notNull(), // R2 的 multipart upload ID
  status: text('status').notNull().default('pending'), // 狀態：pending, completed, failed
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const fileSelectSchema = createSelectSchema(files)

export const fileInsertSchema = createInsertSchema(files)

export const fileUpdateSchema = createUpdateSchema(files)

export const chunkSelectSchema = createSelectSchema(chunks)

export const chunkInsertSchema = createInsertSchema(chunks)

export const chunkUpdateSchema = createUpdateSchema(chunks)

export type SelectFileType = z.output<typeof fileSelectSchema>

export type InsertFileType = z.output<typeof fileInsertSchema>

export type UpdateFileType = z.output<typeof fileUpdateSchema>

export type SelectChunkType = z.output<typeof chunkSelectSchema>

export type InsertChunkType = z.output<typeof chunkInsertSchema>

export type UpdateChunkType = z.output<typeof chunkUpdateSchema>
