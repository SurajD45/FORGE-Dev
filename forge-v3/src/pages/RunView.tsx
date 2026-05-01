import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useCallback } from 'react'
import { pipelineApi } from '@/api/pipeline'
import { Button } from '@/components/ui/Button'
import { QuestionForm } from '@/components/pipeline/QuestionForm'
import { formatDateTime } from '@/utils/format'

const STAGE_DEFS = [
  { n: 1, label: 'Explorer', icon: 'search', desc: 'Understanding intent and mapping requirements' },
  { n: 2, label: 'Architect', icon: 'account_tree', desc: 'Designing structure and file tree' },
  { n: 3, label: 'Developer', icon: 'code', desc: 'Writing all source files' },
  { n: 4, label: 'Reviewer', icon: 'verified', desc: 'Validating logic and auto-fixing issues' },
]

function getStageFromStatus(status: string): number {
  const map: Record<string, number> = {
    queued: 0, stage_1_running: 1, awaiting_user_input: 1,
    stage_2_running: 2, stage_3_running: 3, stage_4_running: 4,
  }
  return map[status] ?? 0
}

function getProgressPct(status: string): number {
  if (status === 'completed') return 100
  if (status === 'failed') return 0
  const map: Record<string, number> = {
    queued: 0, stage_1_running: 15, awaiting_user_input: 20,
    stage_2_running: 45, stage_3_running: 70, stage_4_running: 90,
  }
  return map[status] ?? 0
}

// Simulated log lines per stage (shown while running)
function getLogLines(status: string, currentStage: number): string[] {
  const lines = [
    '[INFO] Pipeline initializing...',
    '[INFO] Connecting to Gemini API...',
    '[INFO] Context loaded successfully',
  ]
  if (currentStage >= 1) lines.push('[AGENT] Explorer: Parsing project description...', '[AGENT] Explorer: Identifying core entities and constraints...')
  if (status === 'awaiting_user_input') lines.push('[PAUSE] Explorer: Awaiting user input — questions generated')
  if (currentStage >= 2) lines.push('[AGENT] Architect: Generating file structure...', '[AGENT] Architect: Mapping module dependencies...')
  if (currentStage >= 3) lines.push('[AGENT] Developer: Writing source files...', '[AGENT] Developer: Implementing route handlers...')
  if (currentStage >= 4) lines.push('[AGENT] Reviewer: Running AST validation...', '[AGENT] Reviewer: Logic consistency check...')
  if (status === 'completed') lines.push('[SUCCESS] Pipeline completed. All 4 stages passed.')
  if (status === 'failed') lines.push('[ERROR] Pipeline encountered an error.')
  return lines
}

export default function RunView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isResuming, setIsResuming] = useState(false)

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
    refetchInterval: (query) => {
      const d = query.state.data
      if (d?.status === 'completed' || d?.status === 'failed') return false
      // Stop polling when awaiting user input — no need to check every 3s
      if (d?.status === 'awaiting_user_input') return false
      return 3000
    },
    refetchIntervalInBackground: true,
  })

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
      const timer = setTimeout(() => navigate(`/run/${id}/artifacts`), 2500)
      return () => clearTimeout(timer)
    }
  }, [status?.status, id, navigate])

  const handleResumeSubmit = useCallback(async (answers: string[]) => {
    if (!id) return
    setIsResuming(true)
    try {
      await pipelineApi.resume({ pipeline_id: id, answers })
      // Invalidate the query to start polling again
      queryClient.invalidateQueries({ queryKey: ['pipeline', id, 'status'] })
    } catch (err) {
      console.error('Resume failed:', err)
    } finally {
      setIsResuming(false)
    }
  }, [id, queryClient])

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`

  if (isLoading && !status) {
    return (
      <div className="p-8 space-y-4 animate-fade-in">
        <div className="h-10 bg-forge-surface rounded-xl w-48 animate-shimmer" />
        <div className="h-72 bg-forge-surface rounded-2xl animate-shimmer" />
        <div className="h-48 bg-forge-surface rounded-2xl animate-shimmer" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="forge-card p-8 border-forge-danger/30 max-w-md w-full text-center">
          <span className="material-symbols-outlined text-forge-danger text-5xl mb-4 block">error</span>
          <h2 className="text-lg font-bold text-forge-danger mb-2">Error loading pipeline</h2>
          <p className="text-forge-muted text-sm mb-6">{(error as { message?: string }).message ?? 'Unknown error'}</p>
          <Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p className="text-forge-muted">Pipeline not found</p>
      </div>
    )
  }

  const isAwaiting = status.status === 'awaiting_user_input'
  const isRunning = ['queued', 'stage_1_running', 'stage_2_running', 'stage_3_running', 'stage_4_running'].includes(status.status)
  const isFailed = status.status === 'failed'
  const isComplete = status.status === 'completed'
  const currentStage = getStageFromStatus(status.status)
  const progress = getProgressPct(status.status)
  const logLines = getLogLines(status.status, currentStage)

  return (
    <div className="min-h-screen animate-fade-in flex flex-col">
      {/* ── Header ─────────────────────────────────── */}
      <div className="px-8 pt-7 pb-5 border-b border-forge-border/20">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isRunning && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-forge-primary px-3 py-1 rounded-full bg-forge-primary/10 border border-forge-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-forge-primary animate-pulse" />Running
                </span>
              )}
              {isAwaiting && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25">
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>pause_circle</span>
                  Awaiting Your Input
                </span>
              )}
              {isComplete && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-forge-success px-3 py-1 rounded-full bg-forge-success/10 border border-forge-success/20">
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check_circle</span>Completed
                </span>
              )}
              {isFailed && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-forge-danger px-3 py-1 rounded-full bg-forge-danger/10 border border-forge-danger/20">
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>error</span>Failed
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-forge-text">Pipeline Run</h1>
            <p className="text-xs font-mono text-forge-muted-dim mt-1">{id}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-forge-text font-mono">{formatTime(elapsedTime)}</p>
            <p className="text-xs text-forge-muted-dim">elapsed time</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 forge-progress h-1.5 w-full">
          <div
            className={`h-full transition-all duration-700 rounded-full ${
              isAwaiting
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'forge-progress-fill'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Meta */}
        <div className="mt-3 flex items-center gap-6 text-xs text-forge-muted-dim">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schedule</span>
            Started {formatDateTime(status.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>update</span>
            Updated {formatDateTime(status.updated_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>data_usage</span>
            Stage {isComplete ? '4/4' : `${currentStage}/4`} — {progress}%
          </span>
        </div>
      </div>

      {/* ── Main split layout ──────────────────────── */}
      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Stage Timeline (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="forge-card p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold text-forge-text mb-6">
              <span className="material-symbols-outlined text-forge-primary" style={{ fontSize: '16px' }}>timeline</span>
              Pipeline Stages
            </h2>

            {/* Error banner */}
            {isFailed && status.error_message && (
              <div className="mb-6 flex gap-3 bg-forge-danger/8 border border-forge-danger/25 rounded-xl p-4">
                <span className="material-symbols-outlined text-forge-danger flex-shrink-0" style={{ fontSize: '18px' }}>error</span>
                <div>
                  <p className="text-sm font-bold text-forge-danger">Pipeline failed</p>
                  <p className="text-xs text-forge-muted mt-0.5">{status.error_message}</p>
                </div>
              </div>
            )}

            <div className="space-y-0">
              {STAGE_DEFS.map((stage, idx) => {
                const isDone = (isComplete) || (currentStage > stage.n)
                const isActive = !isFailed && !isAwaiting && currentStage === stage.n && !isComplete
                const isPaused = isAwaiting && stage.n === 1
                const isPending = currentStage < stage.n && !isComplete

                return (
                  <div key={stage.n} className="flex gap-4">
                    {/* Spine */}
                    <div className="flex flex-col items-center">
                      <div className={[
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500',
                        isDone ? 'bg-forge-success/15 border border-forge-success/30' :
                          isPaused ? 'bg-amber-500/15 border border-amber-500/30' :
                            isActive ? 'bg-forge-primary/20 border border-forge-primary/40 forge-glow-sm' :
                              isFailed && currentStage === stage.n ? 'bg-forge-danger/15 border border-forge-danger/30' :
                                'bg-forge-surface-low border border-forge-border/30',
                      ].join(' ')}>
                        {isDone ? (
                          <span className="material-symbols-outlined text-forge-success" style={{ fontSize: '18px' }}>check_circle</span>
                        ) : isPaused ? (
                          <span className="material-symbols-outlined text-amber-400 animate-pulse" style={{ fontSize: '18px' }}>pause_circle</span>
                        ) : isActive ? (
                          <span className="material-symbols-outlined text-forge-primary animate-pulse" style={{ fontSize: '18px' }}>{stage.icon}</span>
                        ) : (
                          <span className={`material-symbols-outlined ${isPending ? 'text-forge-muted-dim' : 'text-forge-danger'}`} style={{ fontSize: '18px' }}>
                            {isFailed && currentStage === stage.n ? 'error' : stage.icon}
                          </span>
                        )}
                      </div>
                      {idx < STAGE_DEFS.length - 1 && (
                        <div className={`w-px flex-1 my-1 min-h-[24px] ${
                          isDone ? 'bg-forge-success/30' :
                            isPaused ? 'bg-amber-500/20' :
                              isActive ? 'bg-forge-primary/20' : 'bg-forge-border/20'
                        }`} />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-forge-primary/60">0{stage.n}</span>
                        <p className={`text-sm font-bold ${
                          isDone ? 'text-forge-success' :
                            isPaused ? 'text-amber-400' :
                              isActive ? 'text-forge-primary' : 'text-forge-muted'
                        }`}>
                          {stage.label}
                        </p>
                        {isActive && (
                          <span className="text-[10px] text-forge-primary bg-forge-primary/10 px-2 py-0.5 rounded-full font-semibold animate-pulse">
                            Active
                          </span>
                        )}
                        {isPaused && (
                          <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-semibold">
                            Awaiting Input
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-forge-muted-dim mt-0.5">{stage.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Actions */}
            <div className="mt-6 pt-5 border-t border-forge-border/20">
              {isComplete && (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-forge-success">
                    <span className="material-symbols-outlined text-3xl">check_circle</span>
                    <div className="text-left">
                      <p className="font-bold text-sm">Pipeline completed!</p>
                      <p className="text-xs text-forge-muted">Redirecting to artifacts…</p>
                    </div>
                  </div>
                  <Button onClick={() => navigate(`/run/${id}/artifacts`)} size="sm">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>folder_open</span>
                    View artifacts now
                  </Button>
                </div>
              )}
              {isFailed && (
                <div className="flex gap-3">
                  <Button variant="danger" onClick={() => navigate('/run/new')} size="sm">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
                    Try again
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/dashboard')} size="sm">
                    Dashboard
                  </Button>
                </div>
              )}
              {isRunning && (
                <p className="flex items-center gap-2 text-xs text-forge-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-forge-primary animate-pulse" />
                  Pipeline is running — updates automatically every 3s
                </p>
              )}
              {isAwaiting && !isResuming && (
                <p className="flex items-center gap-2 text-xs text-amber-400/80">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
                  Pipeline paused — answer the questions below to continue
                </p>
              )}
            </div>
          </div>

          {/* ── Question Form (shown when awaiting_user_input) ── */}
          {isAwaiting && status.questions && status.questions.length > 0 && (
            <div className="forge-card-glow p-6 border-amber-500/20" style={{ borderColor: 'rgba(245, 158, 11, 0.2)' }}>
              <QuestionForm
                questions={status.questions}
                pipelineId={id}
                onSubmit={handleResumeSubmit}
                isSubmitting={isResuming}
              />
            </div>
          )}
        </div>

        {/* Log Stream (2/5) */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="forge-card flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-forge-border/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-forge-muted-dim" style={{ fontSize: '14px' }}>terminal</span>
              <h2 className="text-xs font-bold text-forge-text">Execution Log</h2>
              {isRunning && <span className="ml-auto text-[10px] text-forge-primary animate-pulse font-mono">● LIVE</span>}
              {isAwaiting && <span className="ml-auto text-[10px] text-amber-400 font-mono">● PAUSED</span>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 log-terminal space-y-1">
              {logLines.map((line, i) => {
                const colorMap: Record<string, string> = {
                  '[INFO]': 'text-forge-muted',
                  '[AGENT]': 'text-forge-primary',
                  '[SUCCESS]': 'text-forge-success',
                  '[ERROR]': 'text-forge-danger',
                  '[WARN]': 'text-forge-warning',
                  '[PAUSE]': 'text-amber-400',
                }
                const tag = Object.keys(colorMap).find(k => line.startsWith(k))
                const color = tag ? colorMap[tag] : 'text-forge-muted'
                return (
                  <p key={i} className={`text-[11px] font-mono leading-relaxed animate-log-in ${color}`}
                    style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="text-forge-muted-dim mr-2">{String(i + 1).padStart(2, '0')}</span>
                    {line}
                  </p>
                )
              })}
              {isRunning && (
                <p className="text-[11px] font-mono text-forge-muted-dim">
                  <span className="text-forge-muted-dim mr-2">  </span>
                  <span className="animate-blink">█</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}