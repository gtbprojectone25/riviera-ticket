'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth'
import { useRouter } from 'next/navigation'
import { EventTicketShowcase } from '@/components/tickets/EventTicketShowcase'
import type { AccountEvent } from '@/types/account'

type Status = 'idle' | 'loading' | 'error' | 'success'

export default function MyEventsPage() {
  const { token, isAuthenticated } = useAuth()
  const router = useRouter()
  const allowDemoFallback =
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ENABLE_DEMO_TICKET_FALLBACK === 'true'

  const [events, setEvents] = useState<AccountEvent[]>([])
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to load tickets')
        }
        const data = (await res.json()) as AccountEvent[]
        setEvents(data)
        setStatus('success')
      } catch (err) {
        if (controller.signal.aborted) return
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to load tickets')
      }
    }

    void load()
    return () => controller.abort()
  }, [isAuthenticated, token, router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-gray-400">You must be logged in.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">My Events</h1>

        {status === 'loading' && (
          <p className="text-sm text-gray-400">Loading tickets...</p>
        )}
        {error && (
          <p className="text-sm text-red-400">Error: {error}</p>
        )}
        {status === 'success' && events.length === 0 && !allowDemoFallback && (
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 space-y-3">
            <p className="text-sm text-gray-300">No tickets found.</p>
            <button
              type="button"
              onClick={() => router.push('/pre-order')}
              className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Browse sessions
            </button>
          </div>
        )}

        {status === 'success' && events.length === 0 && allowDemoFallback && (
          <p className="text-sm text-amber-300">
            Demo mode enabled: showing sample ticket fallback.
          </p>
        )}

        {(status === 'success' && events.length === 0 && allowDemoFallback
          ? [
            {
              id: 'demo-ticket',
              movieTitle: 'The Odyssey',
              sessionTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
              cinemaName: 'Riviera IMAX',
              cinemaAddress: '123 Demo Ave',
              seatLabels: ['B12', 'B13'],
              status: 'reserved',
              amount: 0,
              type: 'STANDARD' as const,
              barcode: undefined,
            },
          ]
          : events
        ).map((event) => (
          <EventTicketShowcase key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}
