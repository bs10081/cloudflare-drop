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
): Promise<ApiResponseType<{ uploadId: string; chunkNumber: number } | { hash: string; code: string; due_date: Date }>> {
  const formData = new FormData()
  formData.append('chunk', chunk)
  
  const params = new URLSearchParams({
    filename,
    totalSize: totalSize.toString(),
    chunkNumber: chunkNumber.toString(),
    totalChunks: totalChunks.toString(),
  })
  
  if (uploadId) {
    params.append('uploadId', uploadId)
  }
  
  const response = await fetch(`/files/chunk?${params}`, {
    method: 'PUT',
    body: formData,
  })
  return processResponse(response)
}

export async function fetchPlainText(id: string): Promise<string> {
  const response = await fetch(`/files/${id}`)
  return response.text()
}
