import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { useApp } from '../../context/AppContext'
import { ArrowRight, Mail, Lock, User, Building2, CheckCircle, ShieldCheck } from 'lucide-react'

type Mode = 'signin' | 'register'

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: React.ReactNode
}

const Field: React.FC<FieldProps> = ({ label, icon, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">{icon}</span>}
      <input
        id={id}
        className={`w-full rounded-xl border border-neutral-300 bg-white py-2.5 ${icon ? 'pl-10' : 'pl-3.5'} pr-3.5 text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors`}
        {...props}
      />
    </div>
  </div>
)

const Logo: React.FC = () => (
  <div className="flex items-center gap-2 justify-center">
    <svg className="w-9 h-9 text-primary-600" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path d="M16 6C10.477 6 6 10.477 6 16C6 21.523 10.477 26 16 26C21.523 26 26 21.523 26 16C26 10.477 21.523 6 16 6ZM16 4C22.627 4 28 9.373 28 16C28 22.627 22.627 28 16 28C9.373 28 4 22.627 4 16C4 9.373 9.373 4 16 4Z" fill="white" />
      <path d="M11 12H21M11 16H19M11 20H17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="8" r="3" fill="#22c55e" />
    </svg>
    <span className="text-2xl font-bold text-neutral-900">LearnLoop</span>
  </div>
)

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, register, continueAsDemo } = useApp()
  const [mode, setMode] = useState<Mode>('signin')
  const [error, setError] = useState<string | null>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [form, setForm] = useState({
    name: '',
    organization: '',
    email: '',
    password: '',
    confirmPassword: '',
    verifyEmail: '',
  })

  const redirectTo = (location.state as { from?: string } | null)?.from || '/wizard'

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (signIn(loginEmail, loginPassword)) {
      navigate(redirectTo, { replace: true })
    } else {
      setError('Invalid email or password.')
    }
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const result = register(form)
    if (result.ok) {
      navigate(redirectTo, { replace: true })
    } else {
      setError(result.error || 'Registration failed.')
    }
  }

  const handleDemo = () => {
    setError(null)
    continueAsDemo()
    navigate('/wizard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <Link to="/" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-neutral-900">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                {mode === 'signin'
                  ? 'Sign in to continue your learning journey'
                  : 'Join LearnLoop and build your adaptive curriculum'}
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl" role="alert">
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}

            {mode === 'signin' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <Field
                  id="login-email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  icon={<Mail className="w-4 h-4" />}
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  required
                />
                <Field
                  id="login-password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                />
                <Button type="submit" fullWidth size="lg">
                  Sign in <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <Field
                  id="reg-name"
                  label="Name"
                  placeholder="Your full name"
                  icon={<User className="w-4 h-4" />}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Field
                  id="reg-org"
                  label="Organization"
                  placeholder="School, company, or team"
                  icon={<Building2 className="w-4 h-4" />}
                  value={form.organization}
                  onChange={e => setForm({ ...form, organization: e.target.value })}
                  required
                />
                <Field
                  id="reg-email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  icon={<Mail className="w-4 h-4" />}
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
                <Field
                  id="reg-password"
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <Field
                  id="reg-confirm"
                  label="Confirm password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                />
                <Field
                  id="reg-verify"
                  label="Verify email"
                  type="email"
                  placeholder="Re-enter your email to verify"
                  icon={<ShieldCheck className="w-4 h-4" />}
                  value={form.verifyEmail}
                  onChange={e => setForm({ ...form, verifyEmail: e.target.value })}
                  required
                />
                <Button type="submit" fullWidth size="lg">
                  Create account <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            )}

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-neutral-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">or</span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>

            <Button type="button" variant="outline" fullWidth size="lg" onClick={handleDemo}>
              Continue with demo
            </Button>

            <p className="mt-6 text-center text-sm text-neutral-600">
              {mode === 'signin' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(null) }}
                    className="font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(null) }}
                    className="font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <CheckCircle className="w-3.5 h-3.5" />
            Runs entirely in your browser · No data leaves your device
          </p>
        </div>
      </main>
    </div>
  )
}
