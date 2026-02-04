'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type QueueGateProps = {
  scopeKey: string
  nextHref: string
  onContinue?: () => void
}

type QueueStatus = 'WAITING' | 'READY' | 'EXPIRED' | 'COMPLETED'

export function QueueGate({ scopeKey, nextHref, onContinue }: QueueGateProps) {
  const router = useRouter()
  const [entryId, setEntryId] = useState<string | null>(null)
  const [queueNumber, setQueueNumber] = useState<number | null>(null)
  const [status, setStatus] = useState<QueueStatus>('WAITING')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [clientReady, setClientReady] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const storageKey = `queue-entry-${scopeKey}`

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
    if (cached) {
      setEntryId(cached)
      return
    }

    const join = async () => {
      try {
        const res = await fetch('/api/queue/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scopeKey }),
        })
        if (!res.ok) throw new Error('Falha ao entrar na fila')
        const data = await res.json()
        setEntryId(data.queueEntryId)
        setQueueNumber(data.queueNumber)
        setStatus(data.status)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, data.queueEntryId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao entrar na fila')
      }
    }

    void join()
  }, [scopeKey, storageKey])

  useEffect(() => {
    if (!entryId) return

    let active = true
    let intervalId: ReturnType<typeof setInterval> | null = null

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/queue/status?entryId=${entryId}`)
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        setStatus(data.status)
        setQueueNumber(data.queueNumber)
        if (typeof data.progress === 'number') {
          setProgress((prev) => (data.progress > prev ? data.progress : prev))
        }
      } catch {
        // ignore transient errors
      }
    }

    void fetchStatus()
    intervalId = setInterval(fetchStatus, 2500)

    return () => {
      active = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [entryId])

  useEffect(() => {
    if (!entryId) return
    let rafId = 0
    const durationMs = 5500
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const next = Math.min(100, (elapsed / durationMs) * 100)
      setProgress((prev) => (prev < next ? next : prev))
      if (next < 100) {
        rafId = requestAnimationFrame(tick)
      } else {
        setClientReady(true)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [entryId])

  useEffect(() => {
    if (status === 'READY') {
      setProgress(100)
      setClientReady(true)
    }
  }, [status])

  useEffect(() => {
    if ((status === 'READY' || clientReady) && buttonRef.current) {
      buttonRef.current.focus()
    }
  }, [status, clientReady])

  const handleContinue = () => {
    if (onContinue) {
      onContinue()
      return
    }
    router.push(nextHref)
  }

  return (
    <div className="w-full rounded-2xl bg-linear-to-br from-slate-950/85 via-slate-950/65 to-blue-950/45 border border-white/10 p-5 space-y-3">
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-2 rounded-full bg-blue-500 transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs tracking-[0.2em] uppercase text-white/60">You are</p>
          <p className="text-2xl font-semibold text-white">#{queueNumber ?? '...'}</p>
        </div>
        <span className="text-xs tracking-[0.2em] uppercase text-white/50">Queue</span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {(status === 'READY' || clientReady) && (
        <div className="relative">
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg text-xs text-white">
            It&apos;s your turn
          </div>
          <div className="pt-8 flex justify-center">
            <Button ref={buttonRef} onClick={handleContinue} className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6">
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
