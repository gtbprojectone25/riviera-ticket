'use client'

import { useEffect, useState } from 'react'
import type { Row } from './types'

interface UseSessionSeatsOptions {
  sessionId: string | null
}

export function useSessionSeats({ sessionId }: UseSessionSeatsOptions) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    const controller = new AbortController()

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/sessions/${sessionId}/seats`, {
          signal: controller.signal,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Erro ao carregar assentos')
        }

        const data = await res.json()
        setRows(data)
      } catch (err) {
        if (controller.signal.aborted) return
        const message =
          err instanceof Error ? err.message : 'Erro ao carregar assentos'
        setError(message)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [sessionId])

  return { rows, loading, error }
}

