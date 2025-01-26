export interface FileType {
  id: string
  code: string
  filename: string | null
  hash: string
  due_date: number
  type: string | null
}

export interface FileUploadedType {
  hash: string
  code: string
  due_date: number
}

export interface ApiResponseType<T> {
  result: boolean
  message: string
  data: T | null
} 