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
      <div className="min-h-screen bg-forge-bg flex items-center justify-center p-6 animate-fade-in">
        <div className="glass-strong rounded-3xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-forge-primary/20 border border-forge-primary/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-forge-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-forge-text mb-2">Check your email</h2>
          <p className="text-forge-muted text-base mb-6">
            We sent a confirmation link. Click it to activate your account, then sign in.
          </p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate('/auth/login')}
          >
            Go to sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-forge-bg flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-forge-text mb-2">Create account</h1>
          <p className="text-forge-muted text-lg">
            Start generating backends with FORGE
          </p>
        </div>

        <div className="glass-strong rounded-3xl p-10 forge-glow">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              className="text-lg py-3"
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              className="text-lg py-3"
              {...register('password')}
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              error={errors.confirm?.message}
              className="text-lg py-3"
              {...register('confirm')}
            />

            {serverError && (
              <div className="text-base text-forge-danger bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                {serverError}
              </div>
            )}

            <Button type="submit" className="w-full text-lg py-4" loading={isSubmitting}>
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-base text-forge-muted mt-6">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-forge-primary hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}