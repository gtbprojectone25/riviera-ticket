'use client'

import { useEffect, useState } from 'react'
import type { AccountEvent } from '@/types/account'

type Status = 'idle' | 'loading' | 'error' | 'success'

export function useAccountEvents(token: string | null, active: boolean) {
  const [events, setEvents] = useState<AccountEvent[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !active) return

    const controller = new AbortController()
    const load = async () => {
      try {
        setStatus('loading')
        setError(null)
        const res = await fetch('/api/account/events', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to load events')
        }
        const data = (await res.json()) as AccountEvent[]
        setEvents(data)
        setStatus('success')
      } catch (err) {
        if (controller.signal.aborted) return
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to load events')
      }
    }

    void load()
    return () => controller.abort()
  }, [token, active])

  return { events, status, error }
}

