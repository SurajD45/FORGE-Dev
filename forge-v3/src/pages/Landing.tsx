import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-forge-bg flex flex-col animate-fade-in">
      {/* Nav */}
      <header className="glass border-b border-forge-border px-8 py-5 flex items-center justify-between">
        <span className="text-2xl font-extrabold">
          <span className="text-forge-primary">FORGE</span>
        </span>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Button size="md" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={() => navigate('/auth/login')}>
                Sign in
              </Button>
              <Button size="md" onClick={() => navigate('/auth/register')}>
                Get started
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 text-center py-32">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-forge-primary/30 text-forge-primary text-sm font-semibold mb-10">
          <span className="w-2 h-2 rounded-full bg-forge-primary animate-pulse" />
          Agentic Dev Studio — V3
        </div>

        <h1 className="text-6xl lg:text-7xl font-extrabold text-forge-text max-w-4xl leading-tight mb-8 animate-slide-up">
          Describe your backend.
          <br />
          <span className="bg-gradient-to-r from-forge-primary to-forge-accent bg-clip-text text-transparent">
            FORGE builds it.
          </span>
        </h1>

        <p className="text-xl text-forge-muted max-w-2xl mb-12 animate-slide-up">
          A multi-agent pipeline that converts a plain English idea into a validated,
          reviewed, runnable FastAPI backend — without writing a single line of code.
        </p>

        <div className="flex items-center gap-4 mb-20 animate-slide-up">
          <Button
            size="lg"
            onClick={() => navigate(isAuthenticated ? '/run/new' : '/auth/register')}
          >
            Start building
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/auth/login')}>
            Sign in
          </Button>
        </div>

        {/* Pipeline stages */}
        <div className="grid grid-cols-4 gap-6 max-w-5xl w-full">
          {[
            { n: '01', label: 'Explorer',  desc: 'Understands your idea'     },
            { n: '02', label: 'Architect', desc: 'Designs the structure'      },
            { n: '03', label: 'Developer', desc: 'Writes all source files'    },
            { n: '04', label: 'Reviewer',  desc: 'Validates and auto-fixes'   },
          ].map((stage, i) => (
            <div
              key={stage.n}
              className="glass-strong rounded-2xl p-6 text-left animate-slide-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="text-sm font-mono font-bold text-forge-primary">{stage.n}</span>
              <p className="text-lg font-bold text-forge-text mt-2">{stage.label}</p>
              <p className="text-sm text-forge-muted mt-2">{stage.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}