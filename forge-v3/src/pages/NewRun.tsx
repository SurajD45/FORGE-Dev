import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { pipelineApi } from '@/api/pipeline'

const schema = z.object({
  project_idea: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters'),
})

type FormData = z.infer<typeof schema>

const TIPS = [
  { icon: 'check_circle', title: 'Be specific with Auth', desc: 'Mention specific providers like Auth0 or Clerk for faster generation.' },
  { icon: 'check_circle', title: 'Define Schema early', desc: 'List your core data entities to ensure the Pipeline maps them correctly.' },
  { icon: 'check_circle', title: 'Target Environment', desc: "Add 'Optimized for Vercel' to get specific infrastructure manifests." },
]

const STAGES = [
  { n: '01', label: 'Explorer', icon: 'search', desc: 'Understands intent' },
  { n: '02', label: 'Architect', icon: 'account_tree', desc: 'Designs structure' },
  { n: '03', label: 'Developer', icon: 'code', desc: 'Writes source code' },
  { n: '04', label: 'Reviewer', icon: 'verified', desc: 'Validates & fixes' },
]

const EXAMPLES = [
  {
    title: 'Task Management API',
    description: 'Build me a task management API with user authentication. Users should be able to create, update, delete, and list tasks. Each task belongs to a user and has a priority level.',
  },
  {
    title: 'Blog Platform',
    description: 'Create a blog API where users can write, edit, and publish posts. Posts should have categories, tags, and comments. Include user authentication and admin functionality.',
  },
  {
    title: 'E-commerce API',
    description: 'Build an e-commerce backend with products, categories, shopping cart, and orders. Include user authentication, payment processing integration points, and inventory management.',
  },
]

export default function NewRun() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showExamples, setShowExamples] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const projectIdea = watch('project_idea')
  const charCount = projectIdea?.length || 0

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const response = await pipelineApi.submit(data)
      navigate(`/run/${response.pipeline_id}`)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail ?? 'Failed to submit. Please try again.'
      setServerError(message)
    }
  }

  return (
    <div className="min-h-screen flex flex-col animate-fade-in">
      {/* ── Header ─────────────────────────────────── */}
      <div className="px-8 pt-8 pb-6 border-b border-forge-border/20">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-forge-primary/12 border border-forge-primary/20 text-forge-primary text-xs font-semibold mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-forge-primary animate-pulse" />
          New Pipeline Run
        </span>
        <h1 className="text-4xl font-black text-forge-text mb-2">Initialize New Run</h1>
        <p className="text-forge-muted max-w-2xl">
          Forge your next neural pipeline. Define the logic, constraints, and architecture in natural language.
        </p>
      </div>

      {/* ── Content ────────────────────────────────── */}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Form (2/3) */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="forge-card p-8 space-y-6">
              {/* Label row */}
              <div className="flex items-baseline justify-between">
                <label className="text-xl font-bold text-forge-text">
                  Project Description
                  <span className="text-forge-danger ml-1">*</span>
                </label>
                <span className={`text-xs font-mono font-bold ${charCount < 20 ? 'text-forge-danger' : 'text-forge-muted-dim'}`}>
                  {charCount}/2000
                </span>
              </div>

              {/* Textarea */}
              <textarea
                {...register('project_idea')}
                rows={13}
                placeholder="Example: Build a task management API where users can create, assign, and track tasks. Include user authentication with JWT, role-based access control (admin/user), and real-time task status updates..."
                className={[
                  'w-full px-5 py-4 rounded-2xl text-sm leading-relaxed',
                  'bg-forge-bg border-2 transition-all duration-200',
                  'text-forge-text placeholder:text-forge-muted-dim font-normal',
                  'focus:outline-none focus:ring-0 resize-none font-mono',
                  errors.project_idea
                    ? 'border-forge-danger/60 focus:border-forge-danger'
                    : charCount > 0
                      ? 'border-forge-primary/40 focus:border-forge-primary/70 forge-glow-sm'
                      : 'border-forge-border/50 focus:border-forge-primary/40',
                ].join(' ')}
              />

              {/* Validation error */}
              {errors.project_idea && (
                <div className="flex items-start gap-2 text-forge-danger text-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                  {errors.project_idea.message}
                </div>
              )}

              {/* Server error */}
              {serverError && (
                <div className="flex items-start gap-3 bg-forge-danger/8 border border-forge-danger/25 rounded-xl p-4">
                  <span className="material-symbols-outlined text-forge-danger flex-shrink-0" style={{ fontSize: '18px' }}>error</span>
                  <div>
                    <p className="text-sm font-bold text-forge-danger">Error</p>
                    <p className="text-xs text-forge-muted mt-0.5">{serverError}</p>
                  </div>
                </div>
              )}

              {/* Tip */}
              <p className="text-xs text-forge-muted-dim leading-relaxed border-t border-forge-border/20 pt-4">
                💡 <strong className="text-forge-muted">Tip:</strong> The more specific you are about features, auth requirements, and constraints, the better FORGE can generate your backend.
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={charCount < 20 || isSubmitting}
                  className={[
                    'flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all',
                    charCount < 20 || isSubmitting
                      ? 'bg-forge-primary/30 text-white/40 cursor-not-allowed'
                      : 'btn-primary',
                  ].join(' ')}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Starting Pipeline...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>rocket_launch</span>
                      Start Pipeline
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3.5 rounded-xl font-semibold text-sm text-forge-muted hover:text-forge-text bg-forge-surface border border-forge-border/40 hover:border-forge-border transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Right: Tips + Pipeline (1/3) */}
          <div className="space-y-5">
            {/* Pro Tips */}
            <div className="forge-card p-5">
              <h3 className="flex items-center gap-2 font-bold text-forge-text text-sm mb-4">
                <span className="material-symbols-outlined text-forge-warning filled" style={{ fontSize: '16px' }}>lightbulb</span>
                Pro Tips
              </h3>
              <div className="space-y-3">
                {TIPS.map((tip) => (
                  <div key={tip.title} className="flex gap-3">
                    <span className="material-symbols-outlined text-forge-success flex-shrink-0" style={{ fontSize: '16px' }}>check_circle</span>
                    <div>
                      <p className="text-xs font-bold text-forge-text">{tip.title}</p>
                      <p className="text-xs text-forge-muted mt-0.5 leading-relaxed">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline Flow */}
            <div className="forge-card p-5">
              <h3 className="flex items-center gap-2 font-bold text-forge-text text-sm mb-4">
                <span className="material-symbols-outlined text-forge-primary" style={{ fontSize: '16px' }}>account_tree</span>
                Pipeline Flow
              </h3>
              <div className="relative">
                {STAGES.map((stage, i) => (
                  <div key={stage.n} className="flex gap-3 items-start">
                    {/* Connector */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-xl bg-forge-primary/15 border border-forge-primary/25 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-forge-primary" style={{ fontSize: '14px' }}>{stage.icon}</span>
                      </div>
                      {i < STAGES.length - 1 && (
                        <div className="w-px h-5 bg-forge-primary/20 my-0.5" />
                      )}
                    </div>
                    <div className="pb-2">
                      <span className="text-[10px] font-mono font-bold text-forge-primary/60">{stage.n}</span>
                      <p className="text-xs font-bold text-forge-text">{stage.label}</p>
                      <p className="text-[11px] text-forge-muted">{stage.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-forge-muted-dim mt-2 font-mono">
                system: Waiting for input execution...
              </p>
            </div>

            {/* Example prompts */}
            <div className="forge-card overflow-hidden">
              <button
                onClick={() => setShowExamples(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left group"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-forge-text">
                  <span className="material-symbols-outlined text-forge-secondary" style={{ fontSize: '16px' }}>layers</span>
                  Example Prompts
                </span>
                <span className={`material-symbols-outlined text-forge-muted transition-transform ${showExamples ? 'rotate-180' : ''}`} style={{ fontSize: '18px' }}>
                  expand_more
                </span>
              </button>
              {showExamples && (
                <div className="border-t border-forge-border/20 divide-y divide-forge-border/15">
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setValue('project_idea', ex.description)}
                      className="w-full text-left px-5 py-3.5 hover:bg-white/3 transition-colors group"
                    >
                      <p className="text-xs font-bold text-forge-primary group-hover:text-forge-primary-dim transition-colors">{ex.title}</p>
                      <p className="text-xs text-forge-muted mt-1 line-clamp-2 leading-relaxed">{ex.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}