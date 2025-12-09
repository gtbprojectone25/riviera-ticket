'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBookingStore } from '@/stores/booking'

type Session = {
  id: string
  movieTitle: string
  movieDuration: number
  startTime: string
  endTime: string
  cinemaName: string
  cinemaId: string | null
  auditoriumId: string | null
  basePrice: number
  vipPrice: number
}

export default function TheOdysseySessionsPage() {
  const router = useRouter()
  const setSelectedSessionId = useBookingStore((s) => s.setSelectedSessionId)
  const setCinema = useBookingStore((s) => s.setCinema)

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/sessions', { signal: controller.signal })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Erro ao carregar sessões')
        }
        const data = (await res.json()) as Session[]
        const filtered = data.filter(
          (s) => s.movieTitle === 'The Odyssey' || s.movieTitle === 'Die Odyssee',
        )
        setSessions(filtered)
      } catch (err) {
        if (controller.signal.aborted) return
        const msg =
          err instanceof Error ? err.message : 'Erro ao carregar sessões'
        setError(msg)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [])

  const handleSelectSession = (session: Session) => {
    setSelectedSessionId(session.id)

    // opcional: setar cinema na store com base no nome
    setCinema({
      id: session.cinemaId ?? session.cinemaName,
      name: session.cinemaName,
      city: '',
      state: '',
      country: '',
      isIMAX: true,
      lat: 0,
      lng: 0,
    })

    router.push('/seat-selection')
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">The Odyssey — IMAX Sessions</h1>
          <p className="text-sm text-gray-400 mt-1">
            Choose a cinema and session to select your seats.
          </p>
        </div>

        {loading && (
          <p className="text-gray-400 text-sm">Loading sessions...</p>
        )}
        {error && (
          <p className="text-red-500 text-sm">Error: {error}</p>
        )}

        <div className="space-y-3">
          {sessions.map((s) => {
            const start = new Date(s.startTime)
            const end = new Date(s.endTime)
            return (
              <button
                key={s.id}
                onClick={() => handleSelectSession(s)}
                className="w-full text-left bg-[#171C20] border border-white/10 rounded-xl p-4 hover:border-blue-500 transition"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-white">
                    {s.cinemaName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {start.toLocaleDateString()} •{' '}
                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                  <span>Standard: ${(s.basePrice / 100).toFixed(2)}</span>
                  <span>VIP: ${(s.vipPrice / 100).toFixed(2)}</span>
                </div>
              </button>
            )
          })}

          {!loading && sessions.length === 0 && !error && (
            <p className="text-gray-400 text-sm">
              No sessions found. Run the IMAX seed script to populate data.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
