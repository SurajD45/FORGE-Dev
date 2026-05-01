import { Link, useNavigate } from 'react-router-dom'
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
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})

type FormData = z.infer<typeof schema>

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [serverError, setServerError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const response = await authApi.register({
        email: data.email,
        password: data.password,
      })

      if (response.access_token === 'email_confirmation_required') {
        setEmailSent(true)
        return
      }

      setAuth(response.access_token, {
        id: response.user_id,
        email: data.email,
      })
      navigate('/dashboard')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail ?? 'Registration failed. Please try again.'
      setServerError(message)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 animate-fade-in">
        <div className="forge-card p-10 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-forge-primary/15 border border-forge-primary/25 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-forge-primary" style={{ fontSize: '28px' }}>mark_email_read</span>
          </div>
          <h2 className="text-xl font-black text-forge-text mb-2">Check your email</h2>
          <p className="text-forge-muted text-sm mb-6">
            We sent a confirmation link. Click it to activate your account, then sign in.
          </p>
          <Button variant="secondary" className="w-full" onClick={() => navigate('/auth/login')}>
            Go to sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 animate-fade-in">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-forge-tertiary/7 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-forge-primary to-forge-tertiary flex items-center justify-center mx-auto mb-4 shadow-xl shadow-forge-primary/30">
            <span className="text-white font-black text-lg">F</span>
          </div>
          <h1 className="text-2xl font-black text-forge-text">Create account</h1>
          <p className="text-forge-muted text-sm mt-1">Start generating backends with FORGE</p>
        </div>

        <div className="forge-card p-8 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            <Input label="Confirm password" type="password" placeholder="••••••••" error={errors.confirm?.message} {...register('confirm')} />

            {serverError && (
              <div className="flex items-start gap-2 bg-forge-danger/8 border border-forge-danger/25 rounded-xl px-3 py-2.5">
                <span className="material-symbols-outlined text-forge-danger flex-shrink-0" style={{ fontSize: '14px' }}>error</span>
                <p className="text-xs text-forge-danger">{serverError}</p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting} size="lg">Create account</Button>
          </form>

          <p className="text-center text-xs text-forge-muted">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-forge-primary hover:text-forge-primary-dim font-semibold transition-colors">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs text-forge-muted-dim mt-6">
          <Link to="/" className="hover:text-forge-muted transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}