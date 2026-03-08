'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    try {
      setLoading(true)
      const response = await fetch('/api/auth/forgot-password-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao solicitar redefinicao de senha.')
        return
      }

      setMessage(data.message || 'Se o email estiver cadastrado, um codigo sera enviado.')
      router.push(`/verify-code?email=${encodeURIComponent(email)}`)
    } catch (err) {
      console.error('Erro ao enviar solicitacao:', err)
      setError('Erro de conexao. Tente novamente.')
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
          <h2>FORGOT PASSWORD</h2>
          <p>Enter your email to receive a verification code</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {message && <p className="text-riv-green text-sm text-center mb-4">{message}</p>}
            {error && <p className="text-riv-red text-sm text-center mb-4">{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                'Send Code'
              )}
            </button>
          </form>

          <div className="security-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Your reset code is temporary and securely delivered.</span>
          </div>

          <div className="login-footer">
            Back to <Link href="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
