import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

const iconNavLinks = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    exact: true,
  },
  {
    to: '/run/new',
    label: 'New Run',
    icon: 'add_circle',
  },
]

const contextNav = [
  { icon: 'dashboard', label: 'Overview', to: '/dashboard' },
  { icon: 'account_tree', label: 'Flow Editor', to: '/dashboard' },
  { icon: 'schema', label: 'Environment', to: '/dashboard' },
  { icon: 'memory', label: 'Training', to: '/dashboard' },
  { icon: 'rocket_launch', label: 'Deployment', to: '/dashboard' },
]

const bottomNav = [
  { icon: 'description', label: 'Documentation' },
  { icon: 'help', label: 'Support' },
]

export function AppShell() {
  const { user, clearAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [contextOpen, setContextOpen] = useState(true)

  const handleLogout = () => {
    clearAuth()
    navigate('/auth/login')
  }

  const userInitial = user?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="min-h-screen bg-forge-bg flex animate-fade-in overflow-hidden">
      {/* ── Icon Rail (56px) ──────────────────────── */}
      <aside className="w-14 flex-shrink-0 flex flex-col items-center py-4 gap-2 glass-nav z-30">
        {/* Logo */}
        <button
          onClick={() => setContextOpen(o => !o)}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-forge-primary to-forge-tertiary flex items-center justify-center mb-3 shadow-lg shadow-forge-primary/30 hover:scale-105 transition-transform"
          title="Toggle panel"
        >
          <span className="text-white font-black text-sm">F</span>
        </button>

        {/* Icon links */}
        <nav className="flex flex-col gap-1 flex-1">
          {iconNavLinks.map((link) => {
            const isActive = link.exact
              ? location.pathname === link.to
              : location.pathname.startsWith(link.to)
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={[
                  'forge-tooltip w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                  isActive
                    ? 'bg-forge-primary/20 text-forge-primary forge-glow-sm'
                    : 'text-forge-muted-dim hover:text-forge-muted hover:bg-white/5',
                ].join(' ')}
                data-tip={link.label}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {link.icon}
                </span>
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="flex flex-col gap-1 mt-auto">
          {bottomNav.map((b) => (
            <button
              key={b.label}
              className="forge-tooltip w-10 h-10 rounded-xl flex items-center justify-center text-forge-muted-dim hover:text-forge-muted hover:bg-white/5 transition-all"
              data-tip={b.label}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{b.icon}</span>
            </button>
          ))}
          {/* Avatar */}
          <button
            onClick={handleLogout}
            className="forge-tooltip w-10 h-10 rounded-full bg-gradient-to-br from-forge-secondary to-forge-primary flex items-center justify-center text-white text-sm font-bold mt-2 hover:opacity-80 transition-opacity"
            data-tip={`Sign out (${user?.email ?? ''})`}
            title="Sign out"
          >
            {userInitial}
          </button>
        </div>
      </aside>

      {/* ── Context Panel (220px, collapsible) ───── */}
      <aside
        className={[
          'flex-shrink-0 flex flex-col transition-all duration-300 overflow-hidden glass-nav border-r border-forge-border/30',
          contextOpen ? 'w-52' : 'w-0',
        ].join(' ')}
      >
        <div className="min-w-[208px]">
          {/* Project name */}
          <div className="px-4 py-5 border-b border-forge-border/20">
            <p className="text-xs text-forge-muted-dim uppercase tracking-widest font-semibold mb-1">Project</p>
            <p className="text-forge-text font-bold truncate">Active Pipeline</p>
            <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-forge-primary/15 text-forge-primary text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-forge-primary animate-pulse" />
              FORGE v3
            </span>
          </div>

          {/* Context nav */}
          <nav className="flex-1 px-2 py-4 space-y-0.5">
            {contextNav.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                    isActive
                      ? 'bg-forge-primary/15 text-forge-primary'
                      : 'text-forge-muted hover:text-forge-text hover:bg-white/4',
                  ].join(' ')
                }
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* User info */}
          <div className="px-4 pb-5 mt-auto border-t border-forge-border/20 pt-4">
            <p className="text-xs text-forge-muted-dim truncate">{user?.email ?? 'unknown'}</p>
            <button
              onClick={handleLogout}
              className="mt-2 flex items-center gap-2 text-xs text-forge-muted hover:text-forge-danger transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>logout</span>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────── */}
      <main className="flex-1 overflow-auto animate-slide-up min-w-0">
        <Outlet />
      </main>
    </div>
  )
}