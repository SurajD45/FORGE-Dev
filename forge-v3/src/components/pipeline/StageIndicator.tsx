import { STAGE_LABELS, type PipelineStatus, STAGE_MAP } from '@/types/pipeline'

interface StageIndicatorProps {
  status: PipelineStatus
  currentStage: number
}

export function StageIndicator({ status, currentStage }: StageIndicatorProps) {
  const isFailed = status === 'failed'
  const isComplete = status === 'completed'

  return (
    <div className="space-y-6">
      {/* Stage boxes */}
      <div className="grid grid-cols-4 gap-4">
        {STAGE_LABELS.map((stage) => {
          const isActive = currentStage === stage.number
          const stageComplete = currentStage > stage.number || isComplete
          const isCurrent = currentStage === stage.number

          return (
            <div
              key={stage.number}
              className={[
                'rounded-lg border-2 p-4 transition-all duration-300',
                isFailed && isCurrent
                  ? 'border-forge-danger bg-red-500/10'
                  : stageComplete
                  ? 'border-forge-success bg-green-500/10'
                  : isActive
                  ? 'border-forge-primary bg-forge-primary/10 forge-glow'
                  : 'border-forge-border bg-forge-surface',
              ].join(' ')}
            >
              {/* Stage number and status icon */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-semibold text-forge-muted">
                  {String(stage.number).padStart(2, '0')}
                </span>
                {stageComplete && !isFailed && (
                  <svg className="w-4 h-4 text-forge-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd" />
                  </svg>
                )}
                {isFailed && isCurrent && (
                  <svg className="w-4 h-4 text-forge-danger animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd" />
                  </svg>
                )}
                {isActive && !stageComplete && !isFailed && (
                  <span className="w-2 h-2 rounded-full bg-forge-primary animate-pulse" />
                )}
              </div>

              {/* Stage label */}
              <h3 className={[
                'text-sm font-semibold mb-1',
                isFailed && isCurrent
                  ? 'text-forge-danger'
                  : stageComplete
                  ? 'text-forge-success'
                  : isActive
                  ? 'text-forge-primary'
                  : 'text-forge-text',
              ].join(' ')}>
                {stage.label}
              </h3>

              {/* Stage description */}
              <p className="text-xs text-forge-muted">{stage.description}</p>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-forge-muted">
            {isFailed ? '❌ Pipeline failed' : isComplete ? '✅ Pipeline complete' : '⏳ Running...'}
          </span>
          <span className="text-forge-muted">
            {isFailed ? '0%' : isComplete ? '100%' : `${(currentStage / 4) * 100}%`}
          </span>
        </div>
        <div className="w-full h-2 bg-forge-border rounded-full overflow-hidden">
          <div
            className={[
              'h-full rounded-full transition-all duration-500',
              isFailed ? 'bg-forge-danger' : 'bg-forge-primary',
            ].join(' ')}
            style={{
              width: isFailed ? '0%' : isComplete ? '100%' : `${(currentStage / 4) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}