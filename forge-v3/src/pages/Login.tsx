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
      setAuth(response.access_token, {
        id: response.user_id,
        email: data.email,
      })
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail ?? 'Login failed. Please try again.'
      setServerError(message)
    }
  }

  return (
    <div className="min-h-screen bg-forge-bg flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-forge-text mb-2">
            Welcome back
          </h1>
          <p className="text-forge-muted text-lg">
            Sign in to your FORGE account
          </p>
        </div>

        {/* Glass card */}
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

            {serverError && (
              <div className="text-base text-forge-danger bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full text-lg py-4"
              loading={isSubmitting}
            >
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-base text-forge-muted mt-6">
          No account?{' '}
          <Link
            to="/auth/register"
            className="text-forge-primary hover:underline font-semibold"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}