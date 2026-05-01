import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { pipelineApi } from '@/api/pipeline'
import { Button } from '@/components/ui/Button'
import { formatRelativeTime, formatStatus } from '@/utils/format'
import type { PipelineStatus } from '@/types/pipeline'

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string; dot: string }> = {
  completed: { color: 'text-forge-success', icon: 'check_circle', label: 'Completed', dot: 'bg-forge-success' },
  failed: { color: 'text-forge-danger', icon: 'error', label: 'Failed', dot: 'bg-forge-danger' },
  queued: { color: 'text-forge-muted', icon: 'schedule', label: 'Queued', dot: 'bg-forge-muted' },
  awaiting_user_input: { color: 'text-amber-400', icon: 'pause_circle', label: 'Awaiting Input', dot: 'bg-amber-400' },
  stage_1_running: { color: 'text-forge-primary', icon: 'sync', label: 'Stage 1', dot: 'bg-forge-primary' },
  stage_2_running: { color: 'text-forge-primary', icon: 'sync', label: 'Stage 2', dot: 'bg-forge-primary' },
  stage_3_running: { color: 'text-forge-primary', icon: 'sync', label: 'Stage 3', dot: 'bg-forge-primary' },
  stage_4_running: { color: 'text-forge-primary', icon: 'sync', label: 'Stage 4', dot: 'bg-forge-primary' },
}

function getStatusConfig(status: PipelineStatus) {
  return STATUS_CONFIG[status] ?? { color: 'text-forge-muted', icon: 'radio_button_unchecked', label: status, dot: 'bg-forge-muted' }
}

function getStageProgress(status: PipelineStatus): number {
  if (status === 'completed') return 100
  if (status === 'failed') return 0
  const stageMap: Record<string, number> = {
    queued: 0, stage_1_running: 25, awaiting_user_input: 20,
    stage_2_running: 50, stage_3_running: 75, stage_4_running: 90
  }
  return stageMap[status] ?? 0
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: runs, isLoading, error, refetch } = useQuery({
    queryKey: ['pipeline', 'runs'],
    queryFn: () => pipelineApi.listRuns(),
    refetchInterval: 10000,
  })

  const totalRuns = runs?.length ?? 0
  const completed = runs?.filter(r => r.status === 'completed').length ?? 0
  const failed = runs?.filter(r => r.status === 'failed').length ?? 0
  const running = runs?.filter(r => !['completed', 'failed'].includes(r.status)).length ?? 0

  return (
    <div className="p-6 lg:p-8 animate-fade-in min-h-screen">
      {/* ── Header ─────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-forge-muted-dim uppercase tracking-widest font-semibold mb-1">Welcome back</p>
          <h1 className="text-3xl font-black text-forge-text">Agent Intelligence Hub</h1>
          <p className="text-forge-muted mt-1 text-sm">
            Real-time performance metrics for{' '}
            <span className="text-forge-primary font-semibold">{user?.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="w-9 h-9 rounded-xl glass border border-forge-border/40 flex items-center justify-center text-forge-muted hover:text-forge-text transition-all hover:border-forge-primary/30"
            title="Refresh"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          </button>
          <Button size="md" onClick={() => navigate('/run/new')}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            New Run
          </Button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Runs', value: totalRuns, icon: 'summarize', color: 'text-forge-text', bg: 'bg-forge-surface/60' },
          { label: 'Completed', value: completed, icon: 'check_circle', color: 'text-forge-success', bg: 'bg-forge-success/10' },
          { label: 'Running', value: running, icon: 'sync', color: 'text-forge-primary', bg: 'bg-forge-primary/10' },
          { label: 'Failed', value: failed, icon: 'error', color: 'text-forge-danger', bg: 'bg-forge-danger/10' },
        ].map((stat) => (
          <div key={stat.label} className="forge-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-forge-muted-dim uppercase tracking-wide font-semibold">{stat.label}</p>
              <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${stat.color}`} style={{ fontSize: '16px' }}>{stat.icon}</span>
              </div>
            </div>
            <p className={`text-3xl font-black ${isLoading ? 'animate-shimmer rounded' : stat.color}`}>
              {isLoading ? '—' : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Recent Runs ─────────────────────────────── */}
      <div className="forge-card overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-forge-border/30 flex items-center justify-between">
          <h2 className="text-sm font-bold text-forge-text flex items-center gap-2">
            <span className="material-symbols-outlined text-forge-primary" style={{ fontSize: '16px' }}>history</span>
            Recent Execution Logs
          </h2>
          {running > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-forge-primary font-semibold px-3 py-1 rounded-full bg-forge-primary/10 border border-forge-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-forge-primary animate-pulse" />
              {running} active
            </span>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl animate-shimmer bg-forge-surface-low" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-8 flex items-center gap-3 text-forge-danger">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span>
            <p className="text-sm">Error loading runs: {(error as { message?: string }).message ?? 'Unknown error'}</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && runs?.length === 0 && (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-forge-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-forge-primary" style={{ fontSize: '32px' }}>rocket_launch</span>
            </div>
            <p className="text-forge-text font-bold text-lg mb-2">No runs yet</p>
            <p className="text-forge-muted text-sm mb-6">Start by creating your first pipeline run</p>
            <Button onClick={() => navigate('/run/new')}>Create your first run</Button>
          </div>
        )}

        {/* Run cards */}
        {runs && runs.length > 0 && (
          <div className="divide-y divide-forge-border/20">
            {runs.map((run) => {
              const cfg = getStatusConfig(run.status)
              const progress = getStageProgress(run.status)
              const isActive = !['completed', 'failed'].includes(run.status)
              return (
                <div
                  key={run.pipeline_id}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-white/3 transition-colors group cursor-pointer"
                  onClick={() => navigate(run.status === 'completed' ? `/run/${run.pipeline_id}/artifacts` : `/run/${run.pipeline_id}`)}
                >
                  {/* Status indicator */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${isActive ? 'animate-pulse' : ''}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <code className="text-sm font-mono text-forge-text font-semibold">
                        {run.pipeline_id.slice(0, 12)}…
                      </code>
                      <span className={`flex items-center gap-1 text-xs font-semibold ${cfg.color}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{cfg.icon}</span>
                        {formatStatus(run.status)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="forge-progress h-1 w-full max-w-xs">
                      <div className="forge-progress-fill h-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Time */}
                  <p className="text-xs text-forge-muted-dim flex-shrink-0">
                    {formatRelativeTime(run.updated_at)}
                  </p>

                  {/* Arrow */}
                  <span className="material-symbols-outlined text-forge-muted-dim group-hover:text-forge-primary transition-colors" style={{ fontSize: '18px' }}>
                    chevron_right
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}