'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft } from 'lucide-react'

import { TicketCounter } from './_components/ticket-counter'
import { TicketSummary } from './_components/ticket-summary'
import { SessionSelector } from './_components/session-selector'

// Store e tipos
import { useBookingStore, type SelectedTicket } from '@/stores/booking'

interface SessionTime {
  id: string
  time: string
  selected: boolean
  movieTitle?: string
  startTime?: string
  endTime?: string
}

type SessionApi = {
  id: string
  movieTitle: string
  movieDuration: number
  startTime: string
  endTime: string
  cinemaId: string | null
  cinemaName: string
}

export default function TicketSelectionPage() {
  const router = useRouter()
  const bootstrapAttempted = useRef(false)
  const isDev = process.env.NODE_ENV !== 'production'

  const selectedCinema = useBookingStore((state) => state.selectedCinema)
  const setSelectedTickets = useBookingStore((state) => state.setSelectedTickets)
  const selectedSessionId = useBookingStore((state) => state.selectedSessionId)
  const setSelectedSessionId = useBookingStore((state) => state.setSelectedSessionId)
  const setSessionData = useBookingStore((state) => state.setSessionData)
  const setCartId = useBookingStore((state) => state.setCartId)
  const setFinalizedTickets = useBookingStore((state) => state.setFinalizedTickets)

  const [sessionTimes, setSessionTimes] = useState<SessionTime[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  const [tickets, setTickets] = useState<SelectedTicket[]>([
    {
      id: 'vip',
      name: 'VIP',
      price: 44900,
      description: ['Valid only for the chosen session', 'Priority access'],
      amount: 0,
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 34900,
      description: ['Valid only for the chosen session', 'Online ticket with access via QR code'],
      amount: 0,
    },
  ])

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && selectedSessionId && selectedSessionId.length !== 36) {
      console.warn('BAD SESSION ID', selectedSessionId, selectedSessionId.length)
    }
  }, [selectedSessionId])

  // Proteção de rota + carregamento das sessões reais
  useEffect(() => {
    if (!selectedCinema) {
      router.push('/location')
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        setSessionsLoading(true)
        setSessionsError(null)

        const params = new URLSearchParams()
        if (selectedCinema.id) {
          params.set('cinemaId', selectedCinema.id)
        }

        const res = await fetch(`/api/sessions?${params.toString()}`)

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Erro ao carregar sessões')
        }

        const data = (await res.json()) as SessionApi[]
        if (cancelled) return

        // Usar todas as sessões retornadas (a API já filtra por cinema)
        let filtered = data

        // Se não houver sessões, tentar criar automaticamente (bootstrap) - apenas uma vez
        if (filtered.length === 0 && !bootstrapAttempted.current) {
          bootstrapAttempted.current = true
          try {
            const createRes = await fetch('/api/sessions/bootstrap', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                cinemaId: selectedCinema.id,
                cinemaName: selectedCinema.name 
              }),
            })
            if (createRes.ok) {
              const refresh = await fetch(`/api/sessions?${params.toString()}`)
              if (refresh.ok) {
                const refreshed = (await refresh.json()) as SessionApi[]
                filtered = refreshed
              }
            }
          } catch {
            // ignora bootstrap failure
          }
        }

        const mapped: SessionTime[] = filtered.map((s, index) => {
          const start = new Date(s.startTime)
          const end = new Date(s.endTime)
          const startLabel = start.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
          const endLabel = end.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })

          return {
            id: s.id,
            time: startLabel, // Apenas horário de início
            selected: index === 0,
            movieTitle: s.movieTitle,
            startTime: s.startTime,
            endTime: s.endTime,
          }
        })

        setSessionTimes(mapped)

        if (mapped[0]) {
          if (mapped[0].id.length !== 36 && isDev) {
            console.warn('[ticket-selection] sessionId length mismatch on bootstrap', { sessionId: mapped[0].id, length: mapped[0].id.length })
          }
          setSelectedSessionId(mapped[0].id)
          setCartId(null)
          setFinalizedTickets([])
          // Salvar dados completos da sessão na store
          setSessionData({
            id: mapped[0].id,
            movieTitle: mapped[0].movieTitle || 'Die Odyssee',
            startTime: mapped[0].startTime || '',
            endTime: mapped[0].endTime || '',
          })
        }
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof Error ? err.message : 'Erro ao carregar sessões'
        setSessionsError(msg)
      } finally {
        if (!cancelled) {
          setSessionsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [selectedCinema, router, setSelectedSessionId, setSessionData, setCartId, setFinalizedTickets, isDev, selectedSessionId])

  const handleSessionSelect = (sessionId: string) => {
    if (isDev) {
      console.debug('[ticket-selection] session click', { sessionId, length: sessionId.length })
      console.warn('sessionId', sessionId, sessionId.length)
    }
    if (sessionId.length !== 36) {
      if (isDev) {
        console.warn('[ticket-selection] invalid sessionId length', { sessionId, length: sessionId.length })
        // Toast dev-only fallback
        if (typeof window !== 'undefined') {
          window.alert('Session id inválido (dev)')
        }
      }
      return
    }

    setSessionTimes((prev) =>
      prev.map((session) => ({
        ...session,
        selected: session.id === sessionId,
      })),
    )
    if (sessionId !== selectedSessionId) {
      setCartId(null)
      setFinalizedTickets([])
    }
    setSelectedSessionId(sessionId)

    // Atualizar dados da sessão na store
    const session = sessionTimes.find((s) => s.id === sessionId)
    if (session) {
      setSessionData({
        id: session.id,
        movieTitle: session.movieTitle || 'Die Odyssee',
        startTime: session.startTime || '',
        endTime: session.endTime || '',
      })
    }
  }

  const handleTicketAmountChange = (ticketId: string, change: number) => {
    setTickets((prev) => {
      const total = prev.reduce((sum, t) => sum + t.amount, 0)

      return prev.map((ticket) => {
        if (ticket.id !== ticketId) return ticket

        if (change > 0 && total >= 4) {
          return ticket
        }

        const next = Math.max(0, ticket.amount + change)
        return { ...ticket, amount: Math.min(4, next) }
      })
    })
  }

  const getTotalTickets = () => {
    return tickets.reduce((total, ticket) => total + ticket.amount, 0)
  }

  const handleNextStep = () => {
    const currentSession = sessionTimes.find((s) => s.selected)
    if (!currentSession) {
      setSessionsError('Selecione uma sessão antes de continuar')
      return
    }

    if (isDev) {
      console.debug('[ticket-selection] navigate', { sessionId: currentSession.id, length: currentSession.id.length })
    }
    if (currentSession.id.length !== 36) {
      if (isDev) {
        console.warn('[ticket-selection] navigation blocked due to invalid sessionId length', { sessionId: currentSession.id, length: currentSession.id.length })
        if (typeof window !== 'undefined') {
          window.alert('Session id inválido (dev)')
        }
      }
      setSessionsError('ID de sessão inválido')
      return
    }

    const selectedTickets = tickets.filter((t) => t.amount > 0)
    setSelectedTickets(selectedTickets)

    setSelectedSessionId(currentSession.id)
    setSessionData({
      id: currentSession.id,
      movieTitle: currentSession.movieTitle || 'Die Odyssee',
      startTime: currentSession.startTime || '',
      endTime: currentSession.endTime || '',
    })

    router.push(`/seat-selection?sessionId=${currentSession.id}`)
  }

  if (!selectedCinema) return null

  return (
    <div className="min-h-screen text-white relative overflow-hidden bg-black/60">
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] pt-8 ">
        <div className="w-full max-w-md rounded-xl mx-4 space-y-6 p-6 bg-[linear-gradient(to_top,#050505_0%,#080808_25%,#0A0A0A_45%,#0D0D0D_65%,#111111_80%,#181818_100%)]">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">The Odyssey</h1>
              <Badge
                variant="secondary"
                className="bg-gray-700 text-white px-3 py-1.5"
              >
                Pre-order
              </Badge>
            </div>
            <hr className="border-gray-700 mb-4" />
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white p-0 h-auto font-normal hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> To go back
            </Button>
            <hr className="border-gray-700 mb-4" />
          </div>

          {/* Cinema Image */}
          <div className="relative w-full aspect-3/4 rounded-xl overflow-hidden bg-black/50">
            <Image
              src="/sala-cinema.png"
              alt="The Odyssey Cinema Pre-order"
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover"
              priority
            />

            <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent z-10" />
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {selectedCinema.name}
                </h2>
                <p className="text-sm text-gray-400">
                  {selectedCinema.address ||
                    `${selectedCinema.city}, ${selectedCinema.state}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-gray-700 text-white px-3 py-1.5">
                  9.7/10
                </Badge>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Extraordinary</div>
                  <div className="text-xs text-gray-500">2.987 reviews</div>
                </div>
              </div>
            </div>
          </div>
          <hr className="border-gray-700 mb-4" />

          {/* Selectors */}
          {sessionsLoading && (
            <p className="text-xs text-gray-400 mb-2">Loading sessions...</p>
          )}
          {sessionsError && !sessionsLoading && (
            <p className="text-xs text-red-400 mb-2">{sessionsError}</p>
          )}
          {!sessionsLoading &&
            !sessionsError &&
            sessionTimes.length > 0 && (
              <SessionSelector
                sessions={sessionTimes}
                onSessionSelect={handleSessionSelect}
              />
            )}

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Choose the type of ticket you will buy
              </h3>
              <p className="text-sm text-gray-400">
                The purchase limit is 4 tickets
              </p>
            </div>
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <TicketCounter
                  key={ticket.id}
                  label={ticket.name}
                  price={ticket.price}
                  description={ticket.description ?? []}
                  amount={ticket.amount}
                  onAmountChange={(change) =>
                    handleTicketAmountChange(ticket.id, change)
                  }
                  maxTotal={4}
                  currentTotal={getTotalTickets()}
                  isVip={ticket.id === 'vip'}
                />
              ))}
            </div>
          </div>

          <TicketSummary tickets={tickets} />

          <div className="pb-6">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold rounded-xl shadow-lg"
              disabled={getTotalTickets() === 0 || sessionsLoading || sessionTimes.length === 0}
              onClick={handleNextStep}
            >
              Escolher assentos
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500 pb-4 opacity-50">
            Secure Checkout provided by Riviera
          </div>
        </div>
      </div>
    </div>
  )
}
