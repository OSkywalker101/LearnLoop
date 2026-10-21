import type { UserProfile } from '../types'

const AUTH_KEY = 'learnloop_auth'

export type AuthMode = 'account' | 'demo'

export interface AuthSession {
  mode: AuthMode
  name: string
  email: string
  organization?: string
  signedInAt: string
}

export interface RegisterInput {
  name: string
  organization: string
  email: string
  password: string
  confirmPassword: string
  verifyEmail: string
}

const ACCOUNT_EMAIL = 'oskywalker@gmail.com'
const ACCOUNT_PASSWORD = 'OS10'

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as AuthSession) : null
  } catch {
    return null
  }
}

export function saveSession(session: AuthSession | null): void {
  try {
    if (session) localStorage.setItem(AUTH_KEY, JSON.stringify(session))
    else localStorage.removeItem(AUTH_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function authenticate(email: string, password: string): AuthSession | null {
  if (email.trim().toLowerCase() !== ACCOUNT_EMAIL || password !== ACCOUNT_PASSWORD) {
    return null
  }
  return {
    mode: 'account',
    name: 'Obi-Wan Skywalker',
    email: ACCOUNT_EMAIL,
    signedInAt: new Date().toISOString(),
  }
}

export interface RegisterResult {
  ok: boolean
  error?: string
  session?: AuthSession
}

export function registerAccount(input: RegisterInput): RegisterResult {
  const name = input.name.trim()
  const email = input.email.trim()
  const verify = input.verifyEmail.trim()

  if (!name) return { ok: false, error: 'Please enter your name.' }
  if (!input.organization.trim()) return { ok: false, error: 'Please enter your organization.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' }
  if (input.password.length < 4) return { ok: false, error: 'Password must be at least 4 characters.' }
  if (input.password !== input.confirmPassword) return { ok: false, error: 'Passwords do not match.' }
  if (!verify) return { ok: false, error: 'Please verify your email address.' }
  if (verify.toLowerCase() !== email.toLowerCase()) return { ok: false, error: 'Verified email must match the email above.' }

  return {
    ok: true,
    session: {
      mode: 'account',
      name,
      email,
      organization: input.organization.trim(),
      signedInAt: new Date().toISOString(),
    },
  }
}

export function createDemoSession(): AuthSession {
  return {
    mode: 'demo',
    name: 'Demo Learner',
    email: 'demo@learnloop.app',
    signedInAt: new Date().toISOString(),
  }
}

export function sessionToUser(session: AuthSession, existing: UserProfile | null): UserProfile {
  if (existing) return { ...existing, name: session.name, email: session.email }
  return {
    id: session.mode === 'demo' ? 'demo-user' : `user-${session.email}`,
    name: session.name,
    email: session.email,
    isAnonymous: session.mode === 'demo',
    createdAt: new Date().toISOString(),
    preferences: {
      defaultTimePerDay: 30,
      defaultDepth: 'thorough',
      preferredFormats: ['text', 'diagrams', 'practice'],
    },
  }
}
