import { getStore } from '@netlify/blobs'
import { randomUUID } from 'node:crypto'

// Maximum file size: 5 MB (Netlify Functions sync body limit ~6 MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024

function corsJson() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }
}

interface IndexEntry {
  key: string
  originalName: string
  size: number
  contentType: string
  uploadedAt: string
  expiresAt: string
}

async function updateIndex(
  store: ReturnType<typeof getStore>,
  entry: IndexEntry
) {
  try {
    const raw = await store.get('_index', { type: 'json' })
    const index: IndexEntry[] = Array.isArray(raw) ? raw : []
    index.push(entry)
    await store.setJSON('_index', index)
  } catch {
    // If index update fails, the file is still stored.
  }
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsJson(),
    })
  }

  try {
    const contentType = req.headers.get('content-type') || ''

    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ error: 'Expected multipart/form-data' }),
        { status: 400, headers: corsJson() }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const expiresInRaw = formData.get('expiresIn') as string | null

    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: corsJson(),
      })
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
        }),
        { status: 413, headers: corsJson() }
      )
    }

    const expiresInMs = expiresInRaw
      ? parseInt(expiresInRaw, 10)
      : 24 * 60 * 60 * 1000

    const clampedExpiresInMs = Math.max(
      60 * 1000,
      Math.min(expiresInMs, 365 * 24 * 60 * 60 * 1000)
    )

    const now = Date.now()
    const expiresAt = new Date(now + clampedExpiresInMs).toISOString()
    const key = randomUUID()
    const buffer = await file.arrayBuffer()

    const store = getStore('file-uploads')

    await store.set(key, buffer, {
      metadata: {
        originalName: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        uploadedAt: new Date(now).toISOString(),
        expiresAt,
      },
    })

    await updateIndex(store, {
      key,
      originalName: file.name,
      size: file.size,
      contentType: file.type || 'application/octet-stream',
      uploadedAt: new Date(now).toISOString(),
      expiresAt,
    })

    const origin = new URL(req.url).origin

    return new Response(
      JSON.stringify({
        key,
        originalName: file.name,
        size: file.size,
        contentType: file.type,
        uploadedAt: new Date(now).toISOString(),
        expiresAt,
        downloadUrl: `${origin}/api/download?key=${key}`,
        expired: false,
      }),
      {
        status: 201,
        headers: corsJson(),
      }
    )
  } catch (err: any) {
    console.error('Upload error:', err?.message || err)
    return new Response(
      JSON.stringify({
        error: 'Upload failed',
        detail: err?.message || String(err),
      }),
      { status: 500, headers: corsJson() }
    )
  }
}
