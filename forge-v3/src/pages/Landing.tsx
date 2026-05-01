import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const stages = [
  { n: '01', label: 'Explorer', desc: 'Understands intent, maps requirements', icon: 'search' },
  { n: '02', label: 'Architect', desc: 'Designs structure and file tree', icon: 'account_tree' },
  { n: '03', label: 'Developer', desc: 'Writes all source files', icon: 'code' },
  { n: '04', label: 'Reviewer', desc: 'Validates logic and auto-fixes', icon: 'verified' },
]

const features = [
  { icon: 'bolt', title: 'Multi-Agent Pipeline', desc: 'Four specialized AI agents collaborate to design, write, and validate your backend.' },
  { icon: 'security', title: 'Built-in Validation', desc: 'AST checks, logic consistency passes, and auto-fix loops ensure production-ready code.' },
  { icon: 'download', title: 'Instant Download', desc: 'Export your entire generated project as a structured ZIP in one click.' },
  { icon: 'visibility', title: 'Real-time Progress', desc: 'Watch each agent stage execute live with streaming logs and stage indicators.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen flex flex-col animate-fade-in overflow-x-hidden">
      {/* ── Nav ────────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass-nav border-b border-forge-border/30 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-forge-primary to-forge-tertiary flex items-center justify-center shadow-lg shadow-forge-primary/40">
            <span className="text-white font-black text-xs">F</span>
          </div>
          <span className="text-lg font-extrabold tracking-tight text-forge-text">FORGE</span>
          <span className="px-2 py-0.5 rounded-full bg-forge-primary/15 text-forge-primary text-xs font-semibold">v3</span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold"
            >
              Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/auth/login')}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-forge-muted hover:text-forge-text hover:bg-white/5 transition-all"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/auth/register')}
                className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold"
              >
                Get started
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center px-6 text-center pt-28 pb-24 overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-forge-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-forge-tertiary/8 rounded-full blur-[100px]" />
        </div>

        {/* Badge */}
        <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-forge-primary/20 text-forge-primary text-sm font-semibold mb-8 animate-slide-up">
          <span className="w-2 h-2 rounded-full bg-forge-primary animate-pulse" />
          Agentic Dev Studio — Powered by Gemini
        </div>

        {/* Headline */}
        <h1 className="relative text-6xl lg:text-8xl font-black max-w-5xl leading-[1.05] mb-6 animate-slide-up" style={{ animationDelay: '80ms' }}>
          <span className="text-forge-text">Describe your backend.</span>
          <br />
          <span className="text-gradient-forge">FORGE builds it.</span>
        </h1>

        {/* Subheadline */}
        <p className="relative text-xl text-forge-muted max-w-2xl mb-12 leading-relaxed animate-slide-up" style={{ animationDelay: '160ms' }}>
          A multi-agent pipeline that converts a plain English idea into a validated,
          reviewed, runnable FastAPI backend — without writing a single line of code.
        </p>

        {/* CTA */}
        <div className="relative flex items-center gap-4 mb-24 animate-slide-up" style={{ animationDelay: '240ms' }}>
          <button
            onClick={() => navigate(isAuthenticated ? '/run/new' : '/auth/register')}
            className="btn-primary px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-2 group"
          >
            Start building
            <span className="material-symbols-outlined transition-transform group-hover:translate-x-1" style={{ fontSize: '20px' }}>arrow_forward</span>
          </button>
          <button
            onClick={() => navigate('/auth/login')}
            className="px-8 py-4 rounded-2xl text-base font-semibold glass border border-forge-border/40 text-forge-muted hover:text-forge-text hover:border-forge-primary/30 transition-all"
          >
            Sign in
          </button>
        </div>

        {/* Stage cards */}
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl w-full">
          {stages.map((stage, i) => (
            <div
              key={stage.n}
              className="forge-card p-5 text-left animate-slide-up group hover:forge-card-glow hover:-translate-y-1 transition-all duration-200"
              style={{ animationDelay: `${320 + i * 80}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-forge-primary/15 flex items-center justify-center mb-3 group-hover:bg-forge-primary/25 transition-colors">
                <span className="material-symbols-outlined text-forge-primary" style={{ fontSize: '20px' }}>{stage.icon}</span>
              </div>
              <span className="text-xs font-mono font-bold text-forge-primary/70">{stage.n}</span>
              <p className="text-base font-bold text-forge-text mt-1">{stage.label}</p>
              <p className="text-xs text-forge-muted mt-1 leading-relaxed">{stage.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────── */}
      <div className="border-y border-forge-border/20 py-8 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { value: '10K+', label: 'APIs Generated' },
            { value: '4', label: 'AI Agents' },
            { value: '< 3m', label: 'Avg. Gen Time' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-black text-gradient-primary">{s.value}</p>
              <p className="text-sm text-forge-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ───────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-forge-text text-center mb-3">Why FORGE?</h2>
          <p className="text-forge-muted text-center mb-12">Built for developers who think fast and ship faster.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="forge-card p-6 flex gap-4 group hover:-translate-y-1 hover:border-forge-primary/20 transition-all duration-200"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="w-11 h-11 rounded-xl bg-forge-primary/15 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-forge-primary" style={{ fontSize: '22px' }}>{f.icon}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-forge-text mb-1">{f.title}</h3>
                  <p className="text-sm text-forge-muted leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center forge-card-glow p-12 rounded-3xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-forge-primary/10 to-forge-tertiary/5 pointer-events-none" />
          <h2 className="relative text-3xl font-black text-forge-text mb-4">Ready to forge your backend?</h2>
          <p className="relative text-forge-muted mb-8">Join developers building production-ready FastAPI backends in minutes.</p>
          <button
            onClick={() => navigate(isAuthenticated ? '/run/new' : '/auth/register')}
            className="btn-primary px-10 py-4 rounded-2xl text-base font-bold"
          >
            Get started free
          </button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="border-t border-forge-border/20 px-8 py-6 flex items-center justify-between text-xs text-forge-muted-dim">
        <span className="font-bold text-forge-muted">FORGE v3</span>
        <span>© 2026 Agentic Dev Studio</span>
      </footer>
    </div>
  )
}