import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-forge-primary hover:bg-forge-primary_h text-white border border-forge-primary ' +
    'hover:border-forge-primary_h disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-forge-surface hover:bg-forge-border text-forge-text border border-forge-border ' +
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent hover:bg-forge-surface text-forge-muted hover:text-forge-text ' +
    'border border-transparent disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-forge-danger hover:bg-red-700 text-white border border-forge-danger ' +
    'disabled:opacity-50 disabled:cursor-not-allowed',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, children, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          'inline-flex items-center justify-center gap-2',
          'rounded-lg font-medium transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-forge-primary focus:ring-offset-2',
          'focus:ring-offset-forge-bg',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'