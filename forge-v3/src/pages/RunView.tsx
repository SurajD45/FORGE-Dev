import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { pipelineApi } from '@/api/pipeline'
import { StageIndicator } from '@/components/pipeline/StageIndicator'
import { Button } from '@/components/ui/Button'
import { formatDateTime, formatStatus } from '@/utils/format'

export default function RunView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [elapsedTime, setElapsedTime] = useState(0)

  if (!id) {
    return (
      <div className="p-8 text-center">
        <p className="text-forge-danger">Invalid pipeline ID</p>
      </div>
    )
  }

  const { data: status, isLoading, error } = useQuery({
    queryKey: ['pipeline', id, 'status'],
    queryFn: () => pipelineApi.getStatus(id),
    refetchInterval: (data) => {
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false
      }
      return 3000
    },
    refetchIntervalInBackground: true,
  })

  // Track elapsed time
  useEffect(() => {
    if (!status) return
    const startTime = new Date(status.created_at).getTime()
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [status])

  // Auto-redirect on completion
  useEffect(() => {
    if (status?.status === 'completed') {
      const timer = setTimeout(() => {
        navigate(`/run/${id}/artifacts`)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [status?.status, id, navigate])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  if (isLoading && !status) {
    return (
      <div className="min-h-screen bg-forge-bg p-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-12 bg-forge-border rounded w-1/3" />
          <div className="h-96 bg-forge-border rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-forge-bg p-8 flex items-center justify-center">
        <div className="forge-surface rounded-2xl p-8 border border-forge-danger max-w-lg w-full">
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 text-forge-danger flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-forge-danger mb-1">Error loading pipeline</h2>
              <p className="text-forge-muted text-sm mb-6">
                {(error as { message?: string }).message ?? 'Unknown error'}
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Back to dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-forge-bg p-8 flex items-center justify-center">
        <p className="text-forge-muted">Pipeline not found</p>
      </div>
    )
  }

  const isRunning = ['queued', 'stage_1_running', 'stage_2_running', 'stage_3_running', 'stage_4_running'].includes(status.status)
  const isFailed = status.status === 'failed'
  const isComplete = status.status === 'completed'

  return (
    <div className="min-h-screen bg-gradient-to-br from-forge-bg via-forge-surface/30 to-forge-bg p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {isRunning && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-forge-primary/10 border border-forge-primary/30">
                    <span className="w-2 h-2 rounded-full bg-forge-primary animate-pulse" />
                    <span className="text-xs font-medium text-forge-primary">Running</span>
                  </div>
                )}
                {isComplete && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                    <svg className="w-4 h-4 text-forge-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-forge-success">Completed</span>
                  </div>
                )}
                {isFailed && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30">
                    <svg className="w-4 h-4 text-forge-danger" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-forge-danger">Failed</span>
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-bold text-forge-text mb-2">Pipeline Run</h1>
              <p className="text-forge-muted text-sm font-mono">{id}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-forge-text">{formatTime(elapsedTime)}</p>
              <p className="text-xs text-forge-muted mt-1">elapsed time</p>
            </div>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-forge-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-forge-muted">Started {formatDateTime(status.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-forge-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-forge-muted">Last updated {formatDateTime(status.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {isFailed && status.error_message && (
          <div className="mb-6 forge-surface rounded-xl p-4 border border-forge-danger bg-red-500/10">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-forge-danger flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-forge-danger">Pipeline failed</p>
                <p className="text-sm text-forge-muted mt-1">{status.error_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stage indicator */}
        <div className="forge-surface rounded-2xl p-8 border border-forge-border mb-8">
          <StageIndicator status={status.status} currentStage={status.current_stage} />
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="forge-surface rounded-xl p-6 border border-forge-border">
            <p className="text-xs text-forge-muted uppercase tracking-wide font-semibold mb-2">Current Stage</p>
            <p className="text-3xl font-bold text-forge-primary">{status.current_stage}/4</p>
            <p className="text-xs text-forge-muted mt-2">
              {status.current_stage === 0 ? 'Queued' :
               status.current_stage === 1 ? 'Explorer active' :
               status.current_stage === 2 ? 'Architect active' :
               status.current_stage === 3 ? 'Developer active' :
               status.current_stage === 4 ? 'Reviewer active' :
               'Complete'}
            </p>
          </div>
          <div className="forge-surface rounded-xl p-6 border border-forge-border">
            <p className="text-xs text-forge-muted uppercase tracking-wide font-semibold mb-2">Status</p>
            <p className="text-2xl font-bold text-forge-text capitalize">
              {status.status.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="forge-surface rounded-xl p-6 border border-forge-border">
            <p className="text-xs text-forge-muted uppercase tracking-wide font-semibold mb-2">Progress</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-forge-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-forge-primary to-forge-accent rounded-full transition-all duration-500"
                  style={{ width: `${(status.current_stage / 4) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-forge-primary font-bold">
                {Math.round((status.current_stage / 4) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isComplete && (
          <div className="text-center forge-surface rounded-2xl p-8 border border-forge-border">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-forge-success/10 mb-4">
              <svg className="w-8 h-8 text-forge-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-forge-text font-semibold mb-2">Pipeline completed successfully!</p>
            <p className="text-forge-muted text-sm mb-6">Redirecting to artifacts in a moment...</p>
            <Button onClick={() => navigate(`/run/${id}/artifacts`)}>
              View artifacts now
            </Button>
          </div>
        )}

        {isFailed && (
          <div className="flex items-center gap-3">
            <Button variant="danger" onClick={() => navigate('/run/new')} size="lg">
              Try again
            </Button>
            <Button variant="ghost" onClick={() => navigate('/dashboard')} size="lg">
              Back to dashboard
            </Button>
          </div>
        )}

        {isRunning && (
          <div className="text-center text-forge-muted">
            <p className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-forge-primary animate-pulse" />
              Pipeline is running — this page updates automatically
            </p>
          </div>
        )}
      </div>
    </div>
  )
}