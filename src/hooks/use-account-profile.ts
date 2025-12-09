'use client'

import { useEffect, useState } from 'react'
import type { UserProfile } from '@/types/account'

type Status = 'idle' | 'loading' | 'error' | 'success'

export function useAccountProfile(token: string | null, active: boolean) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !active) return

    const controller = new AbortController()
    const load = async () => {
      try {
        setStatus('loading')
        setError(null)
        const res = await fetch('/api/user/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to load profile')
        }
        const data = (await res.json()) as UserProfile
        setProfile(data)
        setStatus('success')
      } catch (err) {
        if (controller.signal.aborted) return
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      }
    }

    void load()
    return () => controller.abort()
  }, [token, active])

  return { profile, status, error, setProfile }
}

