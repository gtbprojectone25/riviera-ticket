'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OdysseyLoading } from '@/components/ui/OdysseyLoading'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

type QueueStatus = 'WAITING' | 'READY' | 'EXPIRED' | 'COMPLETED'

const SCOPE_KEY = 'the-odyssey-global'
const STORAGE_KEY = `queue-entry-${SCOPE_KEY}`

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function formatNumberEnUS(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function HeroSection() {
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [entryId, setEntryId] = useState<string | null>(null)
  const [queueNumber, setQueueNumber] = useState<number | null>(null)
  const [initialQueueNumber, setInitialQueueNumber] = useState<number | null>(null)
  const [peopleInQueue, setPeopleInQueue] = useState<number | null>(null)
  const [status, setStatus] = useState<QueueStatus | null>(null)
  const [isQueueLoading, setIsQueueLoading] = useState(true)
  const [queueError, setQueueError] = useState<string | null>(null)

  const router = useRouter()
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Garante que o componente só renderiza lógica de cliente após montagem
  // evitando o erro de Hydration do Next.js
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const updateQueueState = useCallback((data: {
    queueNumber?: number
    initialQueueNumber?: number
    peopleInQueue?: number
    status?: QueueStatus
  }) => {
    const nextQueue = typeof data.queueNumber === 'number' ? data.queueNumber : null
    if (nextQueue !== null) {
      setQueueNumber(nextQueue)
    }

    const nextInitial = typeof data.initialQueueNumber === 'number' ? data.initialQueueNumber : nextQueue
    if (nextInitial !== null) {
      setInitialQueueNumber((prev) => (prev === null ? nextInitial : Math.max(prev, nextInitial)))
    }

    const nextPeople = typeof data.peopleInQueue === 'number'
      ? data.peopleInQueue
      : (nextQueue ?? data.initialQueueNumber ?? null)

    if (nextPeople !== null) {
      setPeopleInQueue(nextPeople)
    }

    if (data.status) {
      setStatus(data.status)
    }
  }, [])

  const joinQueue = useCallback(async () => {
    const res = await fetch('/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scopeKey: SCOPE_KEY }),
    })

    const payload = await res.json().catch(() => ({})) as {
      queueEntryId?: string
      queueNumber?: number
      initialQueueNumber?: number
      peopleInQueue?: number
      status?: QueueStatus
      message?: string
      error?: string
    }

    if (!res.ok || !payload.queueEntryId) {
      throw new Error(payload.message ?? payload.error ?? 'Queue temporarily unavailable. Please try again.')
    }

    setEntryId(payload.queueEntryId)
    window.localStorage.setItem(STORAGE_KEY, payload.queueEntryId)

    updateQueueState({
      queueNumber: payload.queueNumber,
      initialQueueNumber: payload.initialQueueNumber,
      peopleInQueue: payload.peopleInQueue,
      status: payload.status,
    })
  }, [updateQueueState])

  // Bootstrap: só roda no cliente após montagem
  useEffect(() => {
    if (!isMounted) return

    let disposed = false

    const bootstrap = async () => {
      setIsQueueLoading(true)
      setQueueError(null)
      try {
        const cached = window.localStorage.getItem(STORAGE_KEY)
        if (cached) {
          if (!disposed) {
            setEntryId(cached)
          }
          return
        }

        await joinQueue()
      } catch {
        if (!disposed) {
          setQueueError('Queue temporarily unavailable. Please try again.')
        }
      } finally {
        if (!disposed) {
          setIsQueueLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      disposed = true
    }
  }, [joinQueue, isMounted])

  // Sincroniza entryId entre abas do mesmo navegador via storage event
  useEffect(() => {
    if (!isMounted) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return

      if (e.newValue) {
        setEntryId(e.newValue)
        setQueueError(null)
      } else {
        // chave removida (expirou ou foi limpa em outra aba)
        setEntryId(null)
        setQueueNumber(null)
        setInitialQueueNumber(null)
        setPeopleInQueue(null)
        setStatus(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isMounted])

  // Polling de status da fila
  useEffect(() => {
    if (!entryId) return

    let disposed = false

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/queue/status?entryId=${entryId}`, { cache: 'no-store' })
        let data: {
          queueNumber?: number
          initialQueueNumber?: number
          peopleInQueue?: number
          status?: QueueStatus
          error?: string
          message?: string
        } = {}
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          try {
            data = (await res.json()) as typeof data
          } catch {
            data = {}
          }
        } else {
          // resposta não-json (ex.: "PRO FEATURE ONLY")
          data = {}
        }

        if (!res.ok) {
          if (res.status === 404 || res.status === 403) {
            window.localStorage.removeItem(STORAGE_KEY)
            if (!disposed) {
              setEntryId(null)
              setQueueNumber(null)
              setInitialQueueNumber(null)
              setPeopleInQueue(null)
              setStatus(null)
            }
            return
          }
          throw new Error(data.message ?? data.error ?? 'Queue temporarily unavailable. Please try again.')
        }

        if (typeof data.queueNumber !== 'number') {
          throw new Error('Queue response invalid')
        }

        if (disposed) return
        if (data.status === 'EXPIRED') {
          window.localStorage.removeItem(STORAGE_KEY)
          setEntryId(null)
          setQueueNumber(null)
          setInitialQueueNumber(null)
          setPeopleInQueue(null)
          setStatus(null)
          setQueueError('Queue expired. Please re-enter.')
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current)
            pollTimerRef.current = null
          }
          return
        }

        updateQueueState({
          queueNumber: data.queueNumber,
          initialQueueNumber: data.initialQueueNumber,
          peopleInQueue: data.peopleInQueue,
          status: data.status,
        })
        setQueueError(null)
      } catch {
        if (!disposed) {
          setQueueError('Queue temporarily unavailable. Please try again.')
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current)
            pollTimerRef.current = null
          }
        }
      }
    }

    void fetchStatus()
    pollTimerRef.current = setInterval(fetchStatus, 3000)

    return () => {
      disposed = true
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
      }
    }
  }, [entryId, updateQueueState])

  const handleNavigateToPreOrder = () => {
    if (isLoading) return
    setIsLoading(true)
    setTimeout(() => {
      router.push('/pre-order')
    }, 700)
  }

  const handleRetryQueue = async () => {
    setQueueError(null)
    setIsQueueLoading(true)
    try {
      await joinQueue()
    } catch {
      setQueueError('Queue temporarily unavailable. Please try again.')
    } finally {
      setIsQueueLoading(false)
    }
  }

  const safeQueueNumber = queueNumber ?? 1
  const safeInitial = initialQueueNumber ?? peopleInQueue ?? safeQueueNumber
  const base = Math.max(1, safeInitial)
  const progressRatio = queueNumber === null
    ? 0
    : clamp((safeQueueNumber - 1) / Math.max(1, base - 1), 0, 1)

  const positionLabel = queueNumber !== null ? formatNumberEnUS(safeQueueNumber) : '--'
  const peopleLabel = formatNumberEnUS(Math.max(1, peopleInQueue ?? safeInitial ?? 1))

  const queueReady = status === 'READY' || (queueNumber !== null && queueNumber <= 1 && status !== 'WAITING')
  const canContinue = queueReady && !isQueueLoading && !queueError
  const showQueueMetrics = Boolean(entryId && queueNumber !== null)

  return (
    <section className="relative mx-auto w-full max-w-[470px] overflow-hidden rounded-xl border-0 bg-black/40 shadow-[0_15px_40px_rgba(0,0,0,0.4)]">
      <OdysseyLoading isLoading={isLoading} />

      <Image
        src="/aquiles-capa.png"
        alt="The Odyssey"
        fill
        priority
        className="object-cover object-[center_18%]"
      />

      <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/45 to-black/72" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(46,155,233,0.18),transparent_42%)]" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[470px] flex-col px-4 pb-4 pt-9 sm:px-5 sm:pt-10">
        <div className="text-center mt-10 sm:mt-16">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#FFFFFF] ">A film by Christopher Nolan</p>
          <h1 className="mt-2 text-[2.05rem] font-bold tracking-[0.34em] text-[#1E4E73] sm:text-4xl">THE ODYSSEY</h1>
        </div>


        <div className="mt-8 text-center sm:mt-[10px]">
        <p className="text-[25px] font-extrabold uppercase tracking-[0.40em] text-[#db3636] sm:text-2xl mt-[-20px] ">07.17.26</p>
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#FFFFFF] mt-1.5 p-1">SHOT ENTIRELY WITH IMAX FILM CAMERAS</p>
        </div>

        <div className="mt-auto space-y-3 pb-1">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary" className="rounded-full bg-white px-4 py-1 text-xs font-medium text-black">
              Pre-order
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-white/25 bg-black/35 px-4 py-1 text-xs text-white backdrop-blur-sm">
              2026
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-white/25 bg-black/35 px-4 py-1 text-xs text-white backdrop-blur-sm">
              Action | Fantasy
            </Badge>
            <Badge variant="secondary" className="rounded-full border border-white/25 bg-slate-300/25 px-4 py-1 text-xs text-white backdrop-blur-sm">
              +18
            </Badge>
          </div>

          <div className="mx-auto w-[90%] max-w-[900px] rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white sm:text-2xl">You are in the queue</h3>
              <span className="text-3xl font-bold tracking-wide text-white sm:text-4xl">IMAX</span>
            </div>

            <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${progressRatio * 100}%` }}
              />
            </div>

            {/* Enquanto não está montado no cliente, mostra skeleton para evitar hydration mismatch */}
            {!isMounted && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="h-[92px] animate-pulse rounded-xl border border-white/10 bg-white/10" />
                <div className="h-[92px] animate-pulse rounded-xl border border-white/10 bg-white/10" />
              </div>
            )}

            {isMounted && isQueueLoading && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="h-[92px] animate-pulse rounded-xl border border-white/10 bg-white/10" />
                <div className="h-[92px] animate-pulse rounded-xl border border-white/10 bg-white/10" />
              </div>
            )}

            {isMounted && !isQueueLoading && queueError && (
              <div className="mt-4 space-y-3">
                <p className="rounded-xl border border-red-200/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  Queue temporarily unavailable. Please try again.
                </p>
                <Button onClick={handleRetryQueue} className="h-10 w-full rounded-xl bg-white/15 text-white hover:bg-white/25">
                  Retry queue
                </Button>
              </div>
            )}

            {isMounted && !isQueueLoading && showQueueMetrics && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-sm">
                  <p className="text-3xl font-bold leading-none text-white sm:text-4xl">{positionLabel}</p>
                  <p className="mt-2 text-[11px] text-white/80 sm:text-xs">Your position</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-sm">
                  <p className="text-3xl font-bold leading-none text-white sm:text-4xl">{peopleLabel}</p>
                  <p className="mt-2 text-[11px] text-white/80 sm:text-xs">People in queue</p>
                </div>
              </div>
            )}

            {isMounted && !isQueueLoading && !queueError && showQueueMetrics && (
              <div className="mt-4">
                <Button
                  onClick={handleNavigateToPreOrder}
                  disabled={!canContinue}
                  className={`h-10 w-full rounded-xl text-white disabled:cursor-not-allowed disabled:opacity-50 relative overflow-hidden ${
                    canContinue
                      ? 'bg-linear-to-r from-blue-500 via-blue-400 to-blue-500 hover:from-blue-600 hover:via-blue-500 hover:to-blue-600'
                      : 'bg-white/15 hover:bg-white/25'
                  }`}
                >
                  {canContinue && (
                    <span className="absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/30 to-transparent" />
                  )}
                  <span className="relative z-10">
                    {canContinue ? 'Get your ticket' : 'Waiting for your turn...'}
                  </span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
