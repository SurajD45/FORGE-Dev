import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

const navLinks = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    to: '/run/new',
    label: 'New Run',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
]

export function AppShell() {
  const { user, clearAuth } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/auth/login')
  }

  return (
    <div className="min-h-screen bg-forge-bg flex animate-fade-in">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 glass-strong border-r border-forge-border flex flex-col">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-forge-border/50">
          <span className="text-2xl font-extrabold tracking-tight">
            <span className="text-forge-primary">FORGE</span>
            <span className="text-forge-muted text-sm font-normal ml-2">v3</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-base',
                  'transition-all duration-200',
                  isActive
                    ? 'bg-forge-primary/20 text-forge-primary border border-forge-primary/30 forge-glow'
                    : 'text-forge-muted hover:text-forge-text hover:bg-white/5',
                ].join(' ')
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="px-4 py-5 border-t border-forge-border/50">
          <p className="text-sm text-forge-muted truncate mb-3">
            {user?.email ?? 'unknown'}
          </p>
          <Button
            variant="ghost"
            size="md"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto animate-slide-up">
        <Outlet />
      </main>
    </div>
  )
}