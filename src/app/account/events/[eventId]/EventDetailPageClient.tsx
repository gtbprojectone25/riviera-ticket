'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '@/context/auth'
import { EventTicketShowcase } from '@/components/tickets/EventTicketShowcase'
import type { AccountEvent } from '@/types/account'
import { Button } from '@/components/ui/button'

type Status = 'idle' | 'loading' | 'error' | 'success'

type Props = { eventId: string }

export default function EventDetailPageClient({ eventId }: Props) {
  const router = useRouter()
  const { token, isAuthenticated } = useAuth()
  const [event, setEvent] = useState<AccountEvent | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (!token) return

    const controller = new AbortController()
    const load = async () => {
      try {
        setStatus('loading')
        setError(null)
        const res = await fetch('/api/account/events', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to load tickets')
        }
        const data = (await res.json()) as AccountEvent[]
        const found = data.find((item) => item.id === eventId) || null
        setEvent(found)
        setStatus('success')
      } catch (err) {
        if (controller.signal.aborted) return
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to load tickets')
      }
    }

    void load()
    return () => controller.abort()
  }, [isAuthenticated, token, eventId, router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-gray-400">You must be logged in.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white hover:bg-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">My tickets</h1>
        </div>

        {status === 'loading' && (
          <p className="text-sm text-gray-400">Loading tickets...</p>
        )}
        {error && <p className="text-sm text-red-400">Error: {error}</p>}
        {status === 'success' && !event && (
          <p className="text-sm text-gray-400">Event not found.</p>
        )}

        {event && <EventTicketShowcase event={event} />}
      </div>
    </div>
  )
}
