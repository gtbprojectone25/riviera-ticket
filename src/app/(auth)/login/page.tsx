'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

import { useAuth } from '@/context/auth'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-white flex items-center justify-center">
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getSafeReturnTo = () => {
    const raw = searchParams.get('returnTo')
    if (!raw) return '/account'
    if (raw.includes('\r') || raw.includes('\n') || raw.includes('\\')) return '/account'
    if (raw.startsWith('//')) return '/account'

    const base = 'https://riviera.local'
    try {
      const parsed = new URL(raw, base)
      if (parsed.origin !== base) return '/account'
      if (!parsed.pathname.startsWith('/')) return '/account'

      if (parsed.pathname === '/confirmation') {
        const checkoutSessionId = parsed.searchParams.get('checkout_session_id')
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
        if (!checkoutSessionId || !uuidRegex.test(checkoutSessionId)) {
          return '/confirmation'
        }
        return `/confirmation?checkout_session_id=${encodeURIComponent(checkoutSessionId)}`
      }

      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
      return '/account'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const emailRegex = /\S+@\S+\.\S+/
    if (!emailRegex.test(email)) {
      setError('Enter a valid email')
      return
    }
    if (!password) {
      setError('Enter your password')
      return
    }

    try {
      setLoading(true)
      await login(email, password)
      router.replace(getSafeReturnTo())
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid credentials'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="riviera-login-screen">
      <div className="login-wrap">
        <div className="login-logo">RIVIERA</div>
        <div className="imax-badge">
          <span>OFFICIAL PARTNER</span>
          <strong>IMAX</strong>
        </div>

        <div className="login-card animate-in">
          <h2>WELCOME BACK</h2>
          <p>Sign in to manage your tickets and reservations</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="forgot">
              <Link href="#">Forgot password?</Link>
            </div>

            {error && (
              <p className="text-riv-red text-sm text-center mb-4">{error}</p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="login-divider" style={{display: 'none'}}><span>or</span></div>

          <button className="btn-google" style={{display: 'none'}}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285f4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34a853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"/><path fill="#fbbc05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"/><path fill="#ea4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
            Continue with Google
          </button>

          <div className="security-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>256-bit encryption. Your data is secured and never shared with third parties.</span>
          </div>

          <div className="login-footer">
            Don&apos;t have an account?{' '}
            <Link href={`/?returnUrl=${encodeURIComponent(getSafeReturnTo())}`}>
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
