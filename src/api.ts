export interface UploadedFile {
  key: string
  originalName: string
  size: number
  contentType: string
  uploadedAt: string
  expiresAt: string
  expired: boolean
  downloadUrl: string
}

export async function uploadFile(
  file: File,
  expiresInMs: number
): Promise<UploadedFile> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('expiresIn', String(expiresInMs))

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(err.error || 'Upload failed')
  }

  return res.json()
}

export async function listFiles(): Promise<UploadedFile[]> {
  const res = await fetch('/api/files')

  if (!res.ok) {
    throw new Error('Failed to fetch files')
  }

  return res.json()
}
