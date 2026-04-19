import { useEffect, useState } from 'react'
import { ArtifactResponse } from '@/types/pipeline'
import { Button } from '@/components/ui/Button'

interface CodeViewerProps {
  artifact: ArtifactResponse | null
}

export function CodeViewer({ artifact }: CodeViewerProps) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!artifact) {
      setCode(null)
      return
    }

    setLoading(true)
    fetch(artifact.download_url)
      .then(res => res.text())
      .then(text => {
        setCode(text)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching file:', err)
        setLoading(false)
      })
  }, [artifact])

  const handleDownload = () => {
    if (!artifact) return

    // Fetch the file content
    fetch(artifact.download_url)
      .then(res => res.blob())
      .then(blob => {
        // Create a blob URL and trigger download
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = artifact.file_name
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      })
      .catch(err => console.error('Error downloading file:', err))
  }

  if (!artifact) {
    return (
      <div className="flex items-center justify-center h-96 text-forge-muted">
        <p>Select a file to view</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <svg className="w-8 h-8 text-forge-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    )
  }

  const isMarkdown = artifact.file_name.endsWith('.md')
  const isJson = artifact.file_name.endsWith('.json')

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-forge-border">
        <div>
          <h3 className="text-sm font-semibold text-forge-text">{artifact.file_name}</h3>
          <p className="text-xs text-forge-muted mt-1">{artifact.artifact_type}</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDownload}
        >
          ⬇️ Download
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {code ? (
          isMarkdown ? (
            <div className="prose prose-invert max-w-none text-sm">
              <pre className="bg-forge-surface rounded p-4 overflow-auto text-xs text-forge-text whitespace-pre-wrap break-words">
                <code>{code}</code>
              </pre>
            </div>
          ) : isJson ? (
            <pre className="bg-forge-surface rounded p-4 overflow-auto text-xs text-forge-text font-mono">
              {JSON.stringify(JSON.parse(code), null, 2)}
            </pre>
          ) : (
            <pre className="bg-forge-surface rounded p-4 overflow-auto text-xs text-forge-text font-mono">
              {code}
            </pre>
          )
        ) : (
          <div className="text-forge-muted text-sm">No content</div>
        )}
      </div>
    </div>
  )
}