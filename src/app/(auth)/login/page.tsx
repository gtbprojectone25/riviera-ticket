'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

import { useAuth } from '@/context/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <div className="min-h-screen  text-white flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111827] rounded-3xl p-8 shadow-xl border border-white/5">
          <h1 className="text-center text-xl sm:text-2xl font-bold mb-6">
            Create an account or log in
          </h1>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-gray-300">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#1F2933] border border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-gray-300">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#1F2933] border border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white py-3 text-base font-semibold rounded-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </Button>

            <p className="text-center text-sm text-gray-400">
              Don’t have an account?{' '}
              <Link
                href={`/register?returnUrl=${encodeURIComponent(getSafeReturnTo())}`}
                className="text-blue-400 hover:underline"
              >
                Tap to create account
              </Link>
            </p>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500 space-y-2 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              <span>Advanced end-to-end encryption</span>
            </div>
            <p className="leading-relaxed">
              In today’s digital world, privacy isn’t optional — it’s essential. That’s why we implement
              advanced end-to-end encryption powered by state-of-the-art security technologies.
            </p>
            <p className="leading-relaxed">
              Unlike basic encryption methods, our system ensures that your data is locked at the source
              and only unlocked by its rightful recipient. Not even we can access it. Every message, file, or
              transaction is shielded with cutting-edge cryptographic protocols — the same level of protection
              trusted by global banks, governments, and cybersecurity leaders.
            </p>
          </div>
        </div>


      </div>
    </div>
  )
}
