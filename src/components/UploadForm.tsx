import { DragEvent, ChangeEvent, useRef, useState } from 'react'
import { UploadedFile, uploadFile } from '../api'

interface Props {
  onUploadComplete: (file: UploadedFile) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const HOUR = 60 * 60 * 1000

const EXPIRATION_PRESETS = [
  { label: '1 hour', value: HOUR },
  { label: '24 hours', value: 24 * HOUR },
  { label: '7 days', value: 7 * 24 * HOUR },
]

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadForm({ onUploadComplete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [expiresIn, setExpiresIn] = useState(24 * HOUR)
  const [customHours, setCustomHours] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const selectFile = (selectedFile: File | undefined) => {
    setSuccess(false)

    if (!selectedFile) return
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null)
      setError('File is too large. Maximum size is 5 MB.')
      return
    }

    setFile(selectedFile)
    setError(null)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0])
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    selectFile(event.dataTransfer.files[0])
  }

  const removeFile = () => {
    setFile(null)
    setError(null)
    setSuccess(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const choosePreset = (value: number) => {
    setExpiresIn(value)
    setCustomHours('')
  }

  const handleCustomHours = (value: string) => {
    setCustomHours(value)
    const hours = Number(value)
    if (Number.isFinite(hours) && hours > 0) setExpiresIn(hours * HOUR)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const uploadedFile = await uploadFile(file, expiresIn)
      onUploadComplete(uploadedFile)
      setSuccess(true)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Upload failed'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="upload-section">
      <h2>Upload a File</h2>

      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={handleFileChange}
      />

      <div
        className={`drop-zone ${dragging ? 'drag-over' : ''} ${
          file ? 'has-file' : ''
        }`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        {file ? (
          <div className="file-preview">
            <span className="file-icon">📄</span>
            <div className="file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatSize(file.size)}</span>
            </div>
            <button
              type="button"
              className="btn-remove"
              aria-label="Remove selected file"
              onClick={(event) => {
                event.stopPropagation()
                removeFile()
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="drop-placeholder">
            <span className="drop-icon">☁️</span>
            <p>Drop a file here or click to browse</p>
            <span className="drop-hint">Any file type, up to 5 MB</span>
          </div>
        )}
      </div>

      <div className="expiration-section">
        <span className="expiration-label">Link expires after</span>
        <div className="expiration-presets">
          {EXPIRATION_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`preset-btn ${
                !customHours && expiresIn === preset.value ? 'active' : ''
              }`}
              onClick={() => choosePreset(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <label className="custom-expiry">
          <input
            type="number"
            min="1"
            max="8760"
            value={customHours}
            placeholder="Custom"
            onChange={(event) => handleCustomHours(event.target.value)}
          />
          <span>hours</span>
        </label>
      </div>

      <button
        type="button"
        className="btn-upload"
        disabled={!file || uploading}
        onClick={handleUpload}
      >
        {uploading ? 'Uploading…' : '⬆️ Upload File'}
      </button>

      {error && <div className="upload-error">⚠️ {error}</div>}
      {success && (
        <div className="upload-success">✅ File uploaded successfully</div>
      )}
    </section>
  )
}
