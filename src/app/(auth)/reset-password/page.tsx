'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-white flex items-center justify-center">
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  )
}

function ResetPasswordPageContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [flowEmail, setFlowEmail] = useState(searchParams.get('email') ?? '')
  const [flowCode, setFlowCode] = useState(searchParams.get('code') ?? '')

  useEffect(() => {
    if (flowEmail && flowCode) return
    if (typeof window === 'undefined') return

    const storedEmail = window.sessionStorage.getItem('reset_email') ?? ''
    const storedCode = window.sessionStorage.getItem('reset_code') ?? ''

    if (!flowEmail && storedEmail) setFlowEmail(storedEmail)
    if (!flowCode && storedCode) setFlowCode(storedCode)
  }, [flowEmail, flowCode])

  useEffect(() => {
    const queryEmail = searchParams.get('email') ?? ''
    const queryCode = searchParams.get('code') ?? ''

    if (queryEmail && queryEmail !== flowEmail) setFlowEmail(queryEmail)
    if (queryCode && queryCode !== flowCode) setFlowCode(queryCode)
  }, [searchParams, flowEmail, flowCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const normalizedEmail = String(flowEmail ?? '').trim().toLowerCase()
    const normalizedCode = String(flowCode ?? '').replace(/\D/g, '').slice(0, 5)

    if (!normalizedEmail || !normalizedCode) {
      setError('Incomplete information. Please restart the process.')
      return
    }
    if (normalizedCode.length !== 5) {
      setError('Invalid code. Use the 5-digit code sent to your email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, code: normalizedCode, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error resetting password.')
        return
      }

      setMessage(data.message || 'Password reset successfully. Redirecting...')
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('reset_email')
        window.sessionStorage.removeItem('reset_code')
      }
      router.replace('/login')
    } catch (err) {
      console.error('Error resetting password:', err)
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="riviera-login-screen"
      style={{
        minHeight: '100dvh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="login-wrap">
        <div
          className="login-logo flex items-center justify-center gap-2 cursor-pointer"
          onClick={() => router.push('/')}
        >
          <img src="/riviera-logo.ico" alt="Riviera Logo" style={{ height: '24px' }} />
        </div>

        <div className="imax-badge mb-0">
          <span>OFFICIAL PARTNER</span>
          <strong>IMAX</strong>
        </div>

        <div className="login-card animate-in mt-1">
          <h2>RESET PASSWORD</h2>
          <p>Create your new password</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.65)',
                  }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.65)',
                  }}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {message && <p className="text-riv-green text-sm text-center mb-4">{message}</p>}
            {error && <p className="text-riv-red text-sm text-center mb-4">{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="security-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Your password is encrypted and stored securely.</span>
          </div>

          <div className="login-footer">
            Back to <Link href="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
