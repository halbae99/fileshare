import { getStore } from '@netlify/blobs'

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsJson(),
    })
  }

  try {
    const store = getStore('file-uploads')
    const origin = new URL(req.url).origin

    // Try index first (fast path)
    const rawIndex = await store.get('_index', { type: 'json' })

    if (Array.isArray(rawIndex) && rawIndex.length > 0) {
      const now = new Date()
      const files = rawIndex.map((entry: any) => ({
        key: entry.key,
        originalName: entry.originalName || entry.key,
        size: entry.size || 0,
        contentType: entry.contentType || 'application/octet-stream',
        uploadedAt: entry.uploadedAt || '',
        expiresAt: entry.expiresAt || '',
        expired: entry.expiresAt
          ? new Date(entry.expiresAt) < now
          : false,
        downloadUrl: `${origin}/api/download/${entry.key}`,
      }))

      // Sort newest first
      files.sort(
        (a: any, b: any) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )

      return new Response(JSON.stringify(files), { headers: corsJson() })
    }

    // Fallback: iterate blobs
    const { blobs } = await store.list()
    const now = new Date()

    const files = await Promise.all(
      blobs
        .filter((b: any) => b.key !== '_index')
        .map(async (b: any) => {
          try {
            const meta = await store.getMetadata(b.key)
            const metadata = (meta as any)?.metadata || {}
            return {
              key: b.key,
              originalName: metadata.originalName || b.key,
              size: metadata.size || 0,
              contentType:
                metadata.contentType || 'application/octet-stream',
              uploadedAt: metadata.uploadedAt || '',
              expiresAt: metadata.expiresAt || '',
              expired: metadata.expiresAt
                ? new Date(metadata.expiresAt) < now
                : false,
              downloadUrl: `${origin}/api/download/${b.key}`,
            }
          } catch {
            return {
              key: b.key,
              originalName: b.key,
              size: 0,
              contentType: 'application/octet-stream',
              uploadedAt: '',
              expiresAt: '',
              expired: false,
              downloadUrl: `${origin}/api/download/${b.key}`,
            }
          }
        })
    )

    files.sort(
      (a: any, b: any) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )

    return new Response(JSON.stringify(files), { headers: corsJson() })
  } catch (err) {
    console.error('List files error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to list files' }),
      { status: 500, headers: corsJson() }
    )
  }
}

function corsJson() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }
}
