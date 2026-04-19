import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { pipelineApi } from '@/api/pipeline'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  project_idea: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters'),
})

type FormData = z.infer<typeof schema>

const EXAMPLE_PROMPTS = [
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
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

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
    <div className="min-h-screen bg-forge-bg flex flex-col">
      {/* Header section with gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-forge-primary/10 to-forge-accent/10 border-b border-forge-border">
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 right-0 w-96 h-96 bg-forge-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-forge-accent/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative p-12 max-w-6xl mx-auto">
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-forge-primary/30 bg-forge-primary/10 text-forge-primary text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-forge-primary animate-pulse" />
              New Pipeline Run
            </span>
          </div>
          <h1 className="text-5xl font-bold text-forge-text mb-4">
            Describe Your Backend
          </h1>
          <p className="text-xl text-forge-muted max-w-3xl leading-relaxed">
            Tell FORGE what you want to build. Be specific about features, authentication needs, and any special requirements. Our 4-stage pipeline will handle the rest.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-8 lg:p-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Form section - takes 3 columns */}
          <div className="lg:col-span-3">
            <div className="forge-surface rounded-3xl p-10 border border-forge-border">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Textarea with character count */}
                <div>
                  <div className="flex items-baseline justify-between mb-4">
                    <label className="block text-2xl font-bold text-forge-text">
                      Project Description
                      <span className="text-forge-danger ml-2">*</span>
                    </label>
                    <span className={`text-sm font-mono font-semibold ${
                      charCount < 20 ? 'text-forge-danger' : 'text-forge-muted'
                    }`}>
                      {charCount}/2000
                    </span>
                  </div>
                  
                  <textarea
                    {...register('project_idea')}
                    rows={14}
                    placeholder="Example: Build a task management API where users can create, assign, and track tasks. Include user authentication with JWT, role-based access control (admin/user), and real-time task status updates..."
                    className={[
                      'w-full px-6 py-5 rounded-2xl text-lg',
                      'bg-forge-bg border-2 transition-all duration-200',
                      'text-forge-text placeholder:text-forge-muted/60 font-normal leading-relaxed',
                      'focus:outline-none focus:ring-2 focus:ring-forge-primary focus:border-transparent',
                      'resize-none',
                      errors.project_idea
                        ? 'border-forge-danger focus:ring-forge-danger'
                        : charCount > 0
                        ? 'border-forge-primary/30'
                        : 'border-forge-border',
                    ].join(' ')}
                  />
                  
                  {errors.project_idea && (
                    <div className="mt-4 flex items-start gap-3 text-forge-danger">
                      <svg className="w-6 h-6 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-base">{errors.project_idea.message}</span>
                    </div>
                  )}
                  
                  <p className="mt-4 text-base text-forge-muted leading-relaxed">
                    💡 <strong>Tip:</strong> The more specific you are about features, auth requirements, and constraints, the better FORGE can generate your backend.
                  </p>
                </div>

                {/* Error message */}
                {serverError && (
                  <div className="flex items-start gap-4 bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-6">
                    <svg className="w-7 h-7 text-forge-danger flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-bold text-forge-danger text-lg">Error</p>
                      <p className="text-base text-forge-muted mt-1">{serverError}</p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-4 pt-6 border-t border-forge-border">
                  <button
                    type="submit"
                    disabled={charCount < 20 || isSubmitting}
                    className={[
                      'flex-1 inline-flex items-center justify-center gap-3',
                      'rounded-xl font-bold transition-all duration-150',
                      'focus:outline-none focus:ring-4 focus:ring-forge-primary focus:ring-offset-2',
                      'focus:ring-offset-forge-bg',
                      charCount < 20
                        ? 'bg-forge-primary/50 text-white/50 cursor-not-allowed border-2 border-forge-primary/50'
                        : 'bg-forge-primary hover:bg-forge-primary_h text-white border-2 border-forge-primary hover:border-forge-primary_h',
                      'px-8 py-4 text-lg',
                    ].join(' ')}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Starting Pipeline...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Start Pipeline
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className={[
                      'inline-flex items-center justify-center gap-2',
                      'rounded-xl font-semibold transition-all duration-150',
                      'focus:outline-none focus:ring-4 focus:ring-forge-primary focus:ring-offset-2',
                      'focus:ring-offset-forge-bg',
                      'bg-forge-surface hover:bg-forge-border text-forge-text',
                      'px-8 py-4 text-lg border-2 border-forge-border',
                    ].join(' ')}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar with examples and info - takes 1 column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick tips */}
            <div className="forge-surface rounded-2xl p-6 border border-forge-border">
              <h3 className="font-bold text-forge-text mb-4 flex items-center gap-2 text-lg">
                <svg className="w-6 h-6 text-forge-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Writing Tips
              </h3>
              <ul className="space-y-3 text-base">
                <li className="flex gap-2">
                  <span className="text-forge-primary font-bold text-xl">✓</span>
                  <span className="text-forge-muted">Mention specific features needed</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-forge-primary font-bold text-xl">✓</span>
                  <span className="text-forge-muted">Specify auth type (JWT, OAuth, etc)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-forge-primary font-bold text-xl">✓</span>
                  <span className="text-forge-muted">Include any constraints or requirements</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-forge-primary font-bold text-xl">✓</span>
                  <span className="text-forge-muted">Detail resource relationships</span>
                </li>
              </ul>
            </div>

            {/* Pipeline flow */}
            <div className="forge-surface rounded-2xl p-6 border border-forge-border">
              <h3 className="font-bold text-forge-text mb-4 flex items-center gap-2 text-lg">
                <svg className="w-6 h-6 text-forge-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Pipeline Stages
              </h3>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="font-mono font-bold text-forge-primary min-w-fit text-base">01.</span>
                  <span className="text-forge-muted"><strong>Explorer</strong> — Understands your idea</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono font-bold text-forge-primary min-w-fit text-base">02.</span>
                  <span className="text-forge-muted"><strong>Architect</strong> — Designs file structure</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono font-bold text-forge-primary min-w-fit text-base">03.</span>
                  <span className="text-forge-muted"><strong>Developer</strong> — Writes source code</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono font-bold text-forge-primary min-w-fit text-base">04.</span>
                  <span className="text-forge-muted"><strong>Reviewer</strong> — Validates & auto-fixes</span>
                </li>
              </ol>
            </div>

            {/* Example prompts toggle */}
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="w-full forge-surface rounded-2xl p-6 border-2 border-forge-border hover:border-forge-primary/50 transition-all text-left group"
            >
              <h3 className="font-bold text-forge-text mb-2 flex items-center gap-2 group-hover:text-forge-primary transition-colors text-lg">
                <svg className={`w-6 h-6 transition-transform ${showExamples ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Example Prompts
              </h3>
              {showExamples && (
                <div className="space-y-3 mt-4 pt-4 border-t-2 border-forge-border">
                  {EXAMPLE_PROMPTS.map((example, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation()
                        setValue('project_idea', example.description)
                      }}
                      className="w-full text-left p-4 rounded-lg bg-forge-bg hover:bg-forge-border/50 transition-colors group/item"
                    >
                      <p className="text-sm font-bold text-forge-primary group-hover/item:text-forge-accent transition-colors">
                        {example.title}
                      </p>
                      <p className="text-sm text-forge-muted mt-2 line-clamp-2 group-hover/item:text-forge-text transition-colors">
                        {example.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}