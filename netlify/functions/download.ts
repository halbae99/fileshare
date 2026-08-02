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
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Extract key from URL: /api/download/<key>
    const url = new URL(req.url)
    const pathParts = url.pathname.replace(/\/$/, '').split('/')
    const key = pathParts[pathParts.length - 1]

    if (!key || key === 'download') {
      return new Response(JSON.stringify({ error: 'File key is required' }), {
        status: 400,
        headers: corsJson(),
      })
    }

    const store = getStore('file-uploads')
    const entry = await store.getWithMetadata(key)

    if (!entry || !entry.data) {
      return new Response(
        JSON.stringify({ error: 'File not found' }),
        { status: 404, headers: corsJson() }
      )
    }

    const { data, metadata } = entry

    // Check expiration
    if (metadata?.expiresAt) {
      if (new Date(metadata.expiresAt) < new Date()) {
        return new Response(
          JSON.stringify({
            error: 'This download link has expired',
            expired: true,
          }),
          { status: 410, headers: corsJson() }
        )
      }
    }

    const contentType = metadata?.contentType || 'application/octet-stream'
    const originalName = metadata?.originalName || key

    // RFC 5987 filename encoding for non-ASCII names
    const encodedName = encodeURIComponent(originalName)
      .replace(/['()]/g, escape)
      .replace(/\*/g, '%2A')

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${originalName.replace(/"/g, '\\"')}"; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
    })
  } catch (err) {
    console.error('Download error:', err)
    return new Response(
      JSON.stringify({ error: 'Download failed' }),
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
