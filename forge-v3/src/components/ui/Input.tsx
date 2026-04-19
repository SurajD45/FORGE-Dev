import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-forge-text">
            {label}
            {props.required && (
              <span className="text-forge-danger ml-1">*</span>
            )}
          </label>
        )}
        <input
          ref={ref}
          className={[
            'w-full px-3 py-2 rounded-lg text-sm',
            'bg-forge-surface border transition-colors duration-150',
            'text-forge-text placeholder:text-forge-muted',
            'focus:outline-none focus:ring-2 focus:ring-forge-primary focus:border-transparent',
            error
              ? 'border-forge-danger focus:ring-forge-danger'
              : 'border-forge-border',
            className,
          ].join(' ')}
          {...props}
        />
        {error && (
          <p className="text-xs text-forge-danger">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-forge-muted">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'