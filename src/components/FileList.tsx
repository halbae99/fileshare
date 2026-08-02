import { useState } from 'react'
import { UploadedFile } from '../api'

interface Props {
  files: UploadedFile[]
  onRefresh: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timeUntil(iso: string): string {
  if (!iso) return ''
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Expired'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h remaining`
  }
  if (hours > 0) return `${hours}h ${mins}m remaining`
  return `${mins}m remaining`
}

export default function FileList({ files, onRefresh }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const activeFiles = files.filter((f) => !f.expired)
  const expiredFiles = files.filter((f) => f.expired)

  const handleCopy = async (file: UploadedFile) => {
    try {
      await navigator.clipboard.writeText(file.downloadUrl)
      setCopiedKey(file.key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      // Fallback: select the text manually
      const input = document.createElement('input')
      input.value = file.downloadUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopiedKey(file.key)
      setTimeout(() => setCopiedKey(null), 2000)
    }
  }

  if (files.length === 0) {
    return (
      <div className="file-list empty">
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>No files uploaded yet</p>
          <span>Upload a file above to get started!</span>
        </div>
      </div>
    )
  }

  return (
    <div className="file-list">
      <div className="file-list-header">
        <h2>
          Uploaded Files{' '}
          <span className="badge">{activeFiles.length}</span>
        </h2>
        <button className="btn-refresh" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      <div className="file-table">
        {[...activeFiles, ...expiredFiles].map((file) => (
          <div
            key={file.key}
            className={`file-row ${file.expired ? 'expired' : ''}`}
          >
            <div className="file-cell name">
              <span className="file-row-icon">📄</span>
              <div>
                <span className="file-row-name">{file.originalName}</span>
                <span className="file-row-meta">
                  {formatSize(file.size)} &bull; Uploaded{' '}
                  {formatDate(file.uploadedAt)}
                </span>
              </div>
            </div>

            <div className="file-cell expiry">
              {file.expired ? (
                <span className="status-expired">⛔ Expired</span>
              ) : (
                <span className="status-active" title={formatDate(file.expiresAt)}>
                  🕐 {timeUntil(file.expiresAt)}
                </span>
              )}
            </div>

            <div className="file-cell actions">
              {file.expired ? (
                <span className="btn-disabled" title="Download link has expired">
                  🔒 Expired
                </span>
              ) : (
                <>
                  <button
                    className="btn-copy"
                    onClick={() => handleCopy(file)}
                  >
                    {copiedKey === file.key ? '✅ Copied!' : '📋 Copy Link'}
                  </button>
                  <a
                    href={file.downloadUrl}
                    className="btn-download"
                    download
                  >
                    ⬇️ Download
                  </a>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
