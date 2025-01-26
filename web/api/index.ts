import { ApiResponseType, FileType, FileUploadedType } from './types'

async function processResponse<T>(response: Response): Promise<ApiResponseType<T>> {
  if (!response.ok) {
    const error = await response.text()
    return {
      result: false,
      message: error,
    }
  }

  return response.json()
}

export async function upload(
  file: File,
): Promise<ApiResponseType<FileUploadedType>> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/files', {
    method: 'PUT',
    body: formData,
  })

  return processResponse<FileUploadedType>(response)
}

export async function fetchFile(id: string): Promise<ApiResponseType<FileType>> {
  const response = await fetch(`/files/${id}`)

  return processResponse<FileType>(response)
}

export async function fetchPlainText(id: string): Promise<string> {
  const response = await fetch(`/files/${id}`, {
    headers: {
      Accept: 'text/plain',
    },
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return response.text()
}

export async function fetchFileByShareCode(
  code: string,
): Promise<ApiResponseType<FileType>> {
  const response = await fetch(`/files/share/${code}`)

  return processResponse<FileType>(response)
}
