import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { pipelineApi } from '@/api/pipeline'
import { FileTree } from '@/components/artifacts/FileTree'
import { CodeViewer } from '@/components/artifacts/CodeViewer'
import { Button } from '@/components/ui/Button'
import type { ArtifactResponse } from '@/types/pipeline'

export default function Artifacts() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<ArtifactResponse | null>(null)
  const [downloading, setDownloading] = useState(false)

  if (!id) {
    return (
      <div className="p-8 text-center">
        <p className="text-forge-danger">Invalid pipeline ID</p>
      </div>
    )
  }

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['pipeline', id, 'result'],
    queryFn: () => pipelineApi.getResult(id),
  })

  const handleDownloadAll = async () => {
    if (!result?.artifacts) return
    setDownloading(true)

    try {
      // Download all files and create a manifest
      const files: { name: string; content: string }[] = []

      for (const artifact of result.artifacts) {
        const response = await fetch(artifact.download_url)
        const content = await response.text()
        files.push({ name: artifact.file_name, content })
      }

      // Create a JSON manifest
      const manifest = {
        project_id: id,
        download_date: new Date().toISOString(),
        files: files.map(f => f.name),
      }

      // Create a downloadable text file with all contents
      const allContent = files
        .map(f => `\n\n${'='.repeat(60)}\nFILE: ${f.name}\n${'='.repeat(60)}\n\n${f.content}`)
        .join('\n')

      const blob = new Blob([allContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `forge-project-${id.slice(0, 8)}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading all files:', err)
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 bg-forge-border rounded animate-pulse w-48" />
        <div className="h-96 bg-forge-border rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="forge-surface rounded-xl p-6 border border-forge-danger">
          <h2 className="text-lg font-semibold text-forge-danger mb-2">Error loading artifacts</h2>
          <p className="text-forge-muted text-sm mb-4">
            {(error as { message?: string }).message ?? 'Unknown error'}
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="p-8">
        <p className="text-forge-muted">No artifacts found</p>
      </div>
    )
  }

  // Set first file as selected by default
  if (!selectedFile && result.artifacts.length > 0) {
    setSelectedFile(result.artifacts[0])
  }

  return (
    <div className="p-8 h-screen flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-forge-text">Generated Project</h1>
            <p className="text-forge-muted text-sm mt-1">ID: {id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleDownloadAll}
              loading={downloading}
            >
              ⬇️ Download All ({result.artifacts.length} files)
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
            >
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-4 gap-6 min-h-0">
        {/* File tree sidebar */}
        <div className="col-span-1 forge-surface rounded-xl p-4 overflow-auto">
          <h3 className="font-semibold text-forge-text mb-4 sticky top-0 bg-forge-surface pb-2">
            Files ({result.artifacts.length})
          </h3>
          <FileTree
            artifacts={result.artifacts}
            onSelectFile={setSelectedFile}
            selectedFile={selectedFile}
          />
        </div>

        {/* Code viewer */}
        <div className="col-span-3 forge-surface rounded-xl p-6 overflow-hidden flex flex-col">
          <CodeViewer artifact={selectedFile} />
        </div>
      </div>
    </div>
  )
}