import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { pipelineApi } from '@/api/pipeline'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime, formatRelativeTime, formatStatus } from '@/utils/format'
import type { PipelineStatus } from '@/types/pipeline'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: runs, isLoading, error, refetch } = useQuery({
    queryKey: ['pipeline', 'runs'],
    queryFn: () => pipelineApi.listRuns(),
    refetchInterval: 10000, // auto-refresh every 10s
  })

  const getStatusBadgeVariant = (status: PipelineStatus) => {
    switch (status) {
      case 'completed':
        return 'pass'
      case 'failed':
        return 'fail'
      case 'queued':
      case 'stage_1_running':
      case 'stage_2_running':
      case 'stage_3_running':
      case 'stage_4_running':
        return 'info'
      default:
        return 'default'
    }
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-forge-text mb-2">Dashboard</h1>
            <p className="text-lg text-forge-muted">
              Welcome back, <span className="text-forge-primary font-semibold">{user?.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => refetch()}>
              🔄 Refresh
            </Button>
            <Button size="lg" onClick={() => navigate('/run/new')}>
              + New Run
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="glass-strong rounded-2xl p-6 border border-forge-border">
          <p className="text-xs text-forge-muted uppercase tracking-wide font-semibold mb-2">Total Runs</p>
          <p className="text-4xl font-extrabold text-forge-text">
            {runs?.length ?? '—'}
          </p>
        </div>
        <div className="glass-strong rounded-2xl p-6 border border-forge-border">
          <p className="text-xs text-forge-muted uppercase tracking-wide font-semibold mb-2">Completed</p>
          <p className="text-4xl font-extrabold text-forge-success">
            {runs?.filter(r => r.status === 'completed').length ?? '—'}
          </p>
        </div>
        <div className="glass-strong rounded-2xl p-6 border border-forge-border">
          <p className="text-xs text-forge-muted uppercase tracking-wide font-semibold mb-2">Failed</p>
          <p className="text-4xl font-extrabold text-forge-danger">
            {runs?.filter(r => r.status === 'failed').length ?? '—'}
          </p>
        </div>
      </div>

      {/* Runs Table */}
      <div className="glass-strong rounded-2xl overflow-hidden border border-forge-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-forge-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-forge-muted uppercase tracking-wider">
                  Pipeline ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-forge-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-forge-muted uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-forge-muted uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-forge-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forge-border/50">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8">
                    <div className="flex items-center gap-3 text-forge-muted">
                      <div className="animate-spin">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                      <span className="text-sm">Loading runs...</span>
                    </div>
                  </td>
                </tr>
              )}

              {error && (
                <tr>
                  <td colSpan={5} className="px-6 py-8">
                    <div className="text-forge-danger text-sm">
                      Error loading runs: {(error as { message?: string }).message ?? 'Unknown error'}
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && !error && runs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-forge-primary/10 mb-4">
                      <svg className="w-8 h-8 text-forge-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <p className="text-forge-text font-semibold text-lg mb-2">No runs yet</p>
                    <p className="text-forge-muted mb-6">Start by creating your first pipeline run</p>
                    <Button onClick={() => navigate('/run/new')}>
                      Create your first run
                    </Button>
                  </td>
                </tr>
              )}

              {runs?.map(run => (
                <tr
                  key={run.pipeline_id}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <code className="text-sm font-mono text-forge-text">
                      {run.pipeline_id.slice(0, 8)}...
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getStatusBadgeVariant(run.status)}>
                      {formatStatus(run.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-forge-muted">
                    <span title={formatDateTime(run.created_at)}>
                      {formatRelativeTime(run.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-forge-muted">
                    <span title={formatDateTime(run.updated_at)}>
                      {formatRelativeTime(run.updated_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {run.status === 'completed' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/run/${run.pipeline_id}/artifacts`)}
                      >
                        View artifacts
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/run/${run.pipeline_id}`)}
                      >
                        View progress
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}