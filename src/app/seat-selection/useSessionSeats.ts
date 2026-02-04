'use client'

import { useEffect, useRef, useState } from 'react'
import type { Row } from './types'

interface UseSessionSeatsOptions {
  sessionId: string | null
}

export function useSessionSeats({ sessionId }: UseSessionSeatsOptions) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (!sessionId) return

    if (process.env.NODE_ENV === 'development' && sessionId.length !== 36) {
      console.warn('BAD SESSION ID', sessionId, sessionId.length)
    }

    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    const load = async () => {
      const isFirstLoad = !hasLoadedRef.current
      try {
        if (isFirstLoad) {
          setLoading(true)
        }
        setError(null)

        const res = await fetch(`/api/sessions/${sessionId}/seats?ensure=true`)

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Erro ao carregar assentos')
        }

        const data = await res.json()
        if (cancelled) return
        setRows(data)
        if (process.env.NODE_ENV !== 'production') {
          const allSeats = Array.isArray(data) ? data.flatMap((r: { seats?: Array<{ status?: string }> }) => r.seats ?? []) : []
          const counts = allSeats.reduce((acc: Record<string, number>, seat: { status?: string }) => {
            const key = seat.status ?? 'UNKNOWN'
            acc[key] = (acc[key] ?? 0) + 1
            return acc
          }, {})
          console.debug('[seat-selection] seats loaded', { total: allSeats.length, counts })
        }
        hasLoadedRef.current = true
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Erro ao carregar assentos'
        setError(message)
      } finally {
        if (!cancelled && isFirstLoad) {
          setLoading(false)
        }
      }
    }

    void load()
    intervalId = setInterval(() => {
      void load()
    }, 7000)

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [sessionId])

  return { rows, loading, error }
}

