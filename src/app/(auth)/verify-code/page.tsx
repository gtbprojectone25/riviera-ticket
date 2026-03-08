'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function VerifyCodePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-white flex items-center justify-center">
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      }
    >
      <VerifyCodePageContent />
    </Suspense>
  )
}

function VerifyCodePageContent() {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!email) {
      setError('Email address not provided. Go back and enter your email address.')
      return
    }
    if (!/^\d{5}$/.test(code)) {
      setError('Use the 5-digit code sent to your email address.')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error verifying code. Please try again.')
        return
      }

      setMessage(data.message || 'Code verified successfully.')
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('reset_email', email)
        window.sessionStorage.setItem('reset_code', code)
      }
      router.push(`/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`)
    } catch (err) {
      console.error('Error verifying code:', err)
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
          <h2>VERIFY CODE</h2>
          <p>Enter the verification code sent to {email || 'your email'}</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="00000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                maxLength={5}
                required
              />
            </div>

            {message && <p className="text-riv-green text-sm text-center mb-4">{message}</p>}
            {error && <p className="text-riv-red text-sm text-center mb-4">{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify Code'
              )}
            </button>
          </form>

          <div className="security-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>The code expires quickly for your security.</span>
          </div>

          <div className="login-footer">
            Need a new code? <Link href="/forgot-password">Resend</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
