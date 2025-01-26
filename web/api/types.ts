export interface FileType {
  id: string
  code: string
  filename: string | null
  hash: string
  due_date: string
  type: string | null
}

export interface FileUploadedType {
  hash: string
  code: string
  due_date: string
}

export interface ChunkUploadedType {
  uploadId?: string
  chunkNumber?: number
  hash?: string
  code?: string
  due_date?: string
}

export interface ApiResponseType<T> {
  message: string
  result: boolean
  data: T | null
} 