import { useState, useCallback, useEffect } from 'react'
import UploadForm from './components/UploadForm'
import FileList from './components/FileList'
import { UploadedFile, listFiles } from './api'

function App() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFiles = useCallback(async () => {
    try {
      setError(null)
      const data = await listFiles()
      setFiles(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const handleUploadComplete = useCallback(
    (uploaded: UploadedFile) => {
      setFiles((prev) => [uploaded, ...prev])
    },
    []
  )

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="logo">📁</span> FileShare
        </h1>
        <p className="subtitle">
          Upload files and share temporary download links that expire automatically
        </p>
      </header>

      <main className="app-main">
        <UploadForm onUploadComplete={handleUploadComplete} />

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={fetchFiles}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <span>Loading files…</span>
          </div>
        ) : (
          <FileList files={files} onRefresh={fetchFiles} />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Powered by <strong>Netlify Blobs</strong> &bull; Files are stored securely
          and automatically expire
        </p>
      </footer>
    </div>
  )
}

export default App
