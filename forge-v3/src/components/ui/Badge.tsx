type BadgeVariant = 'pass' | 'fail' | 'warn' | 'info' | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  pass:    'bg-green-500/10 text-forge-success border-green-500/20',
  fail:    'bg-red-500/10 text-forge-danger border-red-500/20',
  warn:    'bg-yellow-500/10 text-forge-warning border-yellow-500/20',
  info:    'bg-indigo-500/10 text-forge-primary border-indigo-500/20',
  default: 'bg-forge-surface text-forge-muted border-forge-border',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5',
        'text-xs font-medium rounded-full border',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}