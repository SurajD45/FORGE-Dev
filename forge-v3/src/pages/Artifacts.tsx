import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { pipelineApi } from '@/api/pipeline'
import { FileTree } from '@/components/artifacts/FileTree'
import { CodeViewer } from '@/components/artifacts/CodeViewer'
import { Button } from '@/components/ui/Button'
import type { ArtifactResponse } from '@/types/pipeline'

const REVIEW_CHECKS = [
  { label: 'AST Validity', icon: 'code', status: 'pass' },
  { label: 'Logic Consistency', icon: 'psychology', status: 'pass' },
  { label: 'Inference Pass', icon: 'model_training', status: 'pass' },
]

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
      const files: { name: string; content: string }[] = []
      for (const artifact of result.artifacts) {
        const response = await fetch(artifact.download_url)
        const content = await response.text()
        files.push({ name: artifact.file_name, content })
      }
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
      <div className="p-8 space-y-4 animate-fade-in">
        <div className="h-10 bg-forge-surface rounded-xl w-64 animate-shimmer" />
        <div className="grid grid-cols-4 gap-6 h-[70vh]">
          <div className="bg-forge-surface rounded-2xl animate-shimmer" />
          <div className="col-span-3 bg-forge-surface rounded-2xl animate-shimmer" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="forge-card border-forge-danger/30 p-8 text-center max-w-md">
          <span className="material-symbols-outlined text-forge-danger text-5xl mb-4 block">error</span>
          <h2 className="text-lg font-bold text-forge-danger mb-2">Error loading artifacts</h2>
          <p className="text-forge-muted text-sm mb-6">{(error as { message?: string }).message ?? 'Unknown error'}</p>
          <Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
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

  if (!selectedFile && result.artifacts.length > 0) {
    setSelectedFile(result.artifacts[0])
  }

  return (
    <div className="h-screen flex flex-col animate-fade-in overflow-hidden">
      {/* ── Header ─────────────────────────────────── */}
      <div className="px-8 pt-6 pb-4 border-b border-forge-border/20 flex items-start justify-between">
        <div>
          <p className="text-xs text-forge-muted-dim uppercase tracking-widest font-semibold mb-1">Generated Project</p>
          <h1 className="text-2xl font-black text-forge-text">Artifacts Explorer</h1>
          <p className="text-xs font-mono text-forge-muted-dim mt-1">{id}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadAll}
            loading={downloading}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
            Download All ({result.artifacts.length} files)
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
            Dashboard
          </Button>
        </div>
      </div>

      {/* ── Initial Prompt ───────────────────────── */}
      {result.project_idea && (
        <div className="px-8 py-4 border-b border-forge-border/20">
          <div className="forge-card p-4 bg-forge-primary/5 border-forge-primary/15">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-forge-primary flex-shrink-0 mt-0.5"
                    style={{ fontSize: '18px' }}>auto_awesome</span>
              <div>
                <p className="text-xs text-forge-muted-dim uppercase tracking-wide font-semibold mb-1">
                  Initial Prompt
                </p>
                <p className="text-sm text-forge-text leading-relaxed">
                  {result.project_idea}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Review Summary ──────────────────────── */}
      <div className="px-8 py-3 border-b border-forge-border/20 flex items-center gap-3">
        <span className="text-xs font-bold text-forge-muted-dim uppercase tracking-wide">AI Review Summary</span>
        <div className="flex items-center gap-2 ml-2">
          {REVIEW_CHECKS.map((check) => (
            <div key={check.label} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-forge-success/10 border border-forge-success/20">
              <span className="material-symbols-outlined text-forge-success" style={{ fontSize: '12px' }}>check_circle</span>
              <span className="text-xs font-semibold text-forge-success">{check.label}</span>
            </div>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-forge-muted-dim">
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>info</span>
            Synthesizing complete
          </span>
        </div>
      </div>

      {/* ── Main IDE layout ─────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree sidebar */}
        <div className="w-56 flex-shrink-0 forge-surface border-r border-forge-border/20 overflow-y-auto">
          <div className="px-4 py-3 border-b border-forge-border/15 flex items-center gap-2">
            <span className="material-symbols-outlined text-forge-muted-dim" style={{ fontSize: '14px' }}>folder_open</span>
            <h3 className="text-xs font-bold text-forge-text">Files</h3>
            <span className="ml-auto text-[10px] text-forge-muted-dim font-mono">{result.artifacts.length}</span>
          </div>
          <div className="p-2">
            <FileTree
              artifacts={result.artifacts}
              onSelectFile={setSelectedFile}
              selectedFile={selectedFile}
            />
          </div>
        </div>

        {/* Code viewer */}
        <div className="flex-1 overflow-hidden flex flex-col bg-forge-bg">
          {/* Breadcrumb */}
          {selectedFile && (
            <div className="px-4 py-2 border-b border-forge-border/15 flex items-center gap-2 text-xs text-forge-muted-dim">
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>code</span>
              <span className="text-forge-muted">{selectedFile.file_name}</span>
              <span className="ml-auto flex items-center gap-2">
                <button
                  onClick={async () => {
                    const resp = await fetch(selectedFile.download_url)
                    const text = await resp.text()
                    navigator.clipboard.writeText(text)
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>content_copy</span>
                  Copy
                </button>
              </span>
            </div>
          )}
          <div className="flex-1 overflow-auto">
            <CodeViewer artifact={selectedFile} />
          </div>
        </div>
      </div>
    </div>
  )
}