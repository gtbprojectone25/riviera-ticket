'use client'

import { useEffect, useState } from 'react'
import type { AccountPending } from '@/types/account'

type Status = 'idle' | 'loading' | 'error' | 'success'

export function useAccountPendents(
  token: string | null,
  active: boolean,
  refreshKey: number = 0,
) {
  const [pendents, setPendents] = useState<AccountPending[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !active) return

    const controller = new AbortController()
    const load = async () => {
      try {
        setStatus('loading')
        setError(null)
        const res = await fetch('/api/account/pendents', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to load pendents')
        }
        const data = (await res.json()) as AccountPending[]
        setPendents(data)
        setStatus('success')
      } catch (err) {
        if (controller.signal.aborted) return
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to load pendents')
      }
    }

    void load()
    return () => controller.abort()
  }, [token, active, refreshKey])

  return { pendents, status, error }
}
