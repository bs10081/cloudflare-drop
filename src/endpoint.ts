import { OpenAPIRoute } from 'chanfana'
import { Context } from 'hono'
import { DrizzleD1Database } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'

export class Endpoint extends OpenAPIRoute {
  getDB(c: Context): DrizzleD1Database {
    console.log('取得資料庫連線')
    const db = c.get('db')
    if (!db) {
      console.error('資料庫連線不存在')
      throw new HTTPException(500, {
        message: 'Database connection not found',
      })
    }
    return db
  }

  getKV(c: Context): KVNamespace {
    console.log('取得 KV 連線')
    if (!c.env.file_drops) {
      console.error('KV 命名空間不存在')
      throw new HTTPException(400, {
        message: 'KV namespace binding not found',
      })
    }
    return c.env.file_drops
  }

  error(message: string) {
    console.log('返回錯誤:', message)
    return {
      message,
      result: false,
      data: null,
    }
  }

  success(data: unknown) {
    console.log('返回成功:', data)
    return {
      message: 'ok',
      result: true,
      data,
    }
  }
}
