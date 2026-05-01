import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [serverError, setServerError] = useState<string | null>(null)

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const response = await authApi.login(data)
      setAuth(response.access_token, { id: response.user_id, email: data.email })
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail ?? 'Login failed. Please try again.'
      setServerError(message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 animate-fade-in">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-forge-primary/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-forge-primary to-forge-tertiary flex items-center justify-center mx-auto mb-4 shadow-xl shadow-forge-primary/30">
            <span className="text-white font-black text-lg">F</span>
          </div>
          <h1 className="text-2xl font-black text-forge-text">Welcome back</h1>
          <p className="text-forge-muted text-sm mt-1">Sign in to your FORGE account</p>
        </div>

        {/* Card */}
        <div className="forge-card p-8 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            {serverError && (
              <div className="flex items-start gap-2 bg-forge-danger/8 border border-forge-danger/25 rounded-xl px-3 py-2.5">
                <span className="material-symbols-outlined text-forge-danger flex-shrink-0" style={{ fontSize: '14px' }}>error</span>
                <p className="text-xs text-forge-danger">{serverError}</p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
              Sign in
            </Button>
          </form>

          <p className="text-center text-xs text-forge-muted">
            No account?{' '}
            <Link to="/auth/register" className="text-forge-primary hover:text-forge-primary-dim font-semibold transition-colors">
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-forge-muted-dim mt-6">
          <Link to="/" className="hover:text-forge-muted transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}