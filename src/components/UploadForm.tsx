import { useState, useRef, useCallback } from 'react'
import { UploadedFile, uploadFile } from '../api'

interface Props {
  onUploadComplete: (file: UploadedFile) => void
}

const EXPIRATION_PRESETS: { label: string; value: number }[] = [
  { label: '1 Hour', value: 60 * 60 * 1000 },
  { label: '24 Hours', value: 24 * 60 * 60 * 1000 },
  { label: '7 Days', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 Days', value: 30 * 24 * 60 * 60 * 1000 },
  { label: 'Custom', value: -1 },
]

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function UploadForm({ onUploadComplete }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expiresIn, setExpiresIn] = useState(EXPIRATION_PRESETS[1].value) // default 24h
  const [customDays, setCustomDays] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isCustom = expiresIn === -1
  const effectiveExpiresIn = isCustom
    ? customDays * 24 * 60 * 60 * 1000
    : expiresIn

  const handleFile = useCallback((file: File) => {
    setSelectedFile(file)
    setError(null)
    setSuccess(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleSubmit = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await uploadFile(selectedFile, effectiveExpiresIn)
      onUploadComplete(result)
      setSuccess(true)
      setSelectedFile(null)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="upload-section">
      <h2>Upload a File</h2>

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        {selectedFile ? (
          <div className="file-preview">
            <span className="file-icon">📄</span>
            <div className="file-info">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">{formatSize(selectedFile.size)}</span>
            </div>
            <button
              className="btn-remove"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedFile(null)
              }}
              title="Remove file"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="drop-placeholder">
            <span className="drop-icon">⬆️</span>
            <p>Drag &amp; drop a file here, or click to browse</p>
            <span className="drop-hint">Any file type, up to 5 MB</span>
          </div>
        )}
      </div>

      {/* Expiration selector */}
      <div className="expiration-section">
        <label className="expiration-label">Download link expires in:</label>
        <div className="expiration-presets">
          {EXPIRATION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              className={`preset-btn ${
                preset.value === expiresIn ? 'active' : ''
              }`}
              onClick={() => setExpiresIn(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {isCustom && (
          <div className="custom-expiry">
            <input
              type="number"
              min={1}
              max={365}
              value={customDays}
              onChange={(e) => setCustomDays(Number(e.target.value) || 1)}
            />
            <span>days</span>
          </div>
        )}
      </div>

      {/* Upload button */}
      <button
        className="btn-upload"
        disabled={!selectedFile || uploading}
        onClick={handleSubmit}
      >
        {uploading ? (
          <>
            <span className="spinner-sm" />
            Uploading…
          </>
        ) : (
          '🚀 Upload & Generate Link'
        )}
      </button>

      {error && <div className="upload-error">⚠️ {error}</div>}
      {success && (
        <div className="upload-success">✅ File uploaded! Link is ready below.</div>
      )}
    </div>
  )
}
