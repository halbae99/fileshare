import { getStore } from '@netlify/blobs'

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

  const now = new Date()
  const store = getStore('file-uploads')

  try {
    // 1. Get index blob and identify expired entries
    const raw = await store.get('_index', { type: 'json' })
    const index: IndexEntry[] = Array.isArray(raw) ? raw : []

    const expiredKeys = new Set<string>()
    const expiredFromIndex: IndexEntry[] = []

    for (const entry of index) {
      if (entry.expiresAt && new Date(entry.expiresAt) < now) {
        expiredKeys.add(entry.key)
        expiredFromIndex.push(entry)
      }
    }

    // 2. Also scan all blobs for expired entries not in index
    let deletedCount = 0
    let deletedSize = 0
    const errors: string[] = []

    try {
      const { blobs } = await store.list({ prefix: '' })

      for (const blob of blobs) {
        if (blob.key === '_index') continue

        try {
          // Check metadata (skip full download for efficiency)
          const entry = await store.getWithMetadata(blob.key)
          const expiresAt = (entry as any)?.metadata?.expiresAt

          if (expiresAt && new Date(expiresAt) < now) {
            await store.delete(blob.key)
            deletedCount++
            deletedSize += (entry as any)?.metadata?.size || 0
            expiredKeys.add(blob.key)
          }
        } catch (err: any) {
          errors.push(`Failed to process ${blob.key}: ${err?.message || err}`)
        }
      }
    } catch (err: any) {
      errors.push(`Failed to list blobs: ${err?.message || err}`)
    }

    // 3. Clean up index blob
    if (expiredKeys.size > 0) {
      const cleanedIndex = index.filter((e) => !expiredKeys.has(e.key))
      await store.setJSON('_index', cleanedIndex)
    }

    // 4. Return summary
    const remaining = index.length - expiredFromIndex.length

    return new Response(
      JSON.stringify({
        success: true,
        cleanedAt: now.toISOString(),
        deletedCount,
        deletedSize,
        deletedKeys: [...expiredKeys],
        remainingFiles: Math.max(0, remaining),
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: corsJson() }
    )
  } catch (err: any) {
    console.error('Cleanup error:', err?.message || err)
    return new Response(
      JSON.stringify({
        error: 'Cleanup failed',
        detail: err?.message || String(err),
      }),
      { status: 500, headers: corsJson() }
    )
  }
}
