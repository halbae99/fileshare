import { getStore } from '@netlify/blobs'

function corsJson() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }
}

function extractKey(req: Request): string | null {
  const url = new URL(req.url)

  // 1. Query parameter (most reliable across Netlify rewrites)
  const queryKey = url.searchParams.get('key')
  if (queryKey) return queryKey

  // 2. URL path segment: /api/download/<key>
  const parts = url.pathname.replace(/\/$/, '').split('/')
  const last = parts[parts.length - 1]
  if (last && last !== 'download' && last !== '') return last

  // 3. Netlify original request header (fallback for rewritten URLs)
  const originalUri = req.headers.get('x-nf-request-uri')
  if (originalUri) {
    try {
      const originalUrl = new URL(originalUri, url.origin)
      const origKey = originalUrl.searchParams.get('key')
      if (origKey) return origKey
      const origParts = originalUrl.pathname.replace(/\/$/, '').split('/')
      const origLast = origParts[origParts.length - 1]
      if (origLast && origLast !== 'download' && origLast !== '') return origLast
    } catch { /* ignore */ }
  }

  return null
}

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

  const key = extractKey(req)

  if (!key) {
    console.error('Download: no key found in request', req.url)
    return new Response(
      JSON.stringify({ error: 'File key is required. Use /api/download?key=YOUR_KEY' }),
      { status: 400, headers: corsJson() }
    )
  }

  try {
    const store = getStore('file-uploads')

    // Fetch data and metadata separately — getWithMetadata returns data as
    // a UTF-8 string by default which CORRUPTS binary files (PDF, images, etc).
    // Using { type: 'arrayBuffer' } preserves raw bytes for all file types.
    const [data, metadataObj] = await Promise.all([
      store.get(key, { type: 'arrayBuffer' }),
      store.getMetadata(key),
    ])

    if (!data) {
      console.error(`Download: blob not found for key=${key}`)
      return new Response(
        JSON.stringify({ error: 'File not found', key }),
        { status: 404, headers: corsJson() }
      )
    }

    const metadata = (metadataObj as any)?.metadata || metadataObj || {}

    // Check expiration
    if (metadata?.expiresAt) {
      if (new Date(metadata.expiresAt) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'This download link has expired', expired: true }),
          { status: 410, headers: corsJson() }
        )
      }
    }

    const contentType = metadata?.contentType || 'application/octet-stream'
    const originalName = metadata?.originalName || key

    // RFC 5987 / RFC 6266 safe filename encoding
    const asciiName = originalName.replace(/[^\x00-\x7F]/g, '_')
    const encodedName = encodeURIComponent(originalName)

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition':
          `attachment; filename="${asciiName.replace(/"/g, '\\"')}"; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
    })
  } catch (err: any) {
    console.error('Download error:', err?.message || err)
    return new Response(
      JSON.stringify({
        error: 'Download failed',
        detail: err?.message || String(err),
      }),
      { status: 500, headers: corsJson() }
    )
  }
}
