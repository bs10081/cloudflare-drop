import { ApiResponseType, FileType, FileUploadedType, ChunkUploadedType } from './types'

async function processResponse(response: Response) {
  if (response.ok) return await response.json()

  return {
    result: false,
    data: null,
    message: await response.text(),
  }
}

export async function resolveFileByCode(
  code: string,
): Promise<ApiResponseType<FileType>> {
  const response = await fetch(`/files/share/${code}`)
  return processResponse(response)
}

export async function uploadFile(
  data: Blob,
): Promise<ApiResponseType<FileUploadedType>> {
  const formData = new FormData()
  formData.append('file', data)
  const response = await fetch('/files', {
    method: 'PUT',
    body: formData,
  })
  return processResponse(response)
}

export async function uploadChunk(
  chunk: Blob,
  filename: string,
  totalSize: number,
  chunkNumber: number,
  totalChunks: number,
  uploadId?: string,
): Promise<ApiResponseType<ChunkUploadedType>> {
  const formData = new FormData()
  formData.append('chunk', chunk)
  
  const url = new URL('/files/chunk', window.location.origin)
  url.searchParams.set('filename', filename)
  url.searchParams.set('totalSize', totalSize.toString())
  url.searchParams.set('chunkNumber', chunkNumber.toString())
  url.searchParams.set('totalChunks', totalChunks.toString())
  if (uploadId) {
    url.searchParams.set('uploadId', uploadId)
  }
  
  const response = await fetch(url.toString(), {
    method: 'PUT',
    body: formData,
  })
  return processResponse(response)
}

export async function fetchPlainText(id: string): Promise<string> {
  const response = await fetch(`/files/${id}`)
  return response.text()
}
