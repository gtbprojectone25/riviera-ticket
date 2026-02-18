'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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

const CINEMA_IMAGES: Record<string, string[]> = {
  amclincolnsquare: ['/cinemas/AMC Lincoln Square_01.jpg', '/cinemas/AMC Lincoln Square_02.jpg'],
  amcmetreon16: ['/cinemas/AMC Metreon 16_02.jpg', '/cinemas/AMC Metreon 16_03.jpg'],
  autonationimaxmuseumofdiscoveryscience: [
    '/cinemas/Autonation IMAX, Museum of Discovery & Science_01.jpg',
    '/cinemas/Autonation IMAX, Museum of Discovery & Science_02.jpg',
  ],
  bfiimax: ['/cinemas/BFI IMAX_01 .png', '/cinemas/BFI IMAX_02.jpg'],
  celebrationcinemagrandrapidsnorthimax: [
    '/cinemas/Celebration! Cinema Grand Rapids North & IMAX_01.png',
    '/cinemas/Celebration! Cinema Grand Rapids North & IMAX_02.jpg',
  ],
  cinemarkdallasimax: ['/cinemas/Cinemark Dallas IMAX_01.jpg', '/cinemas/Cinemark Dallas IMAX_02.jpg'],
  cineplexcinemaslangley: ['/cinemas/Cineplex Cinemas Langley_01.jpg', '/cinemas/Cineplex Cinemas Langley_02.jpg'],
  cineplexcinemasmississaugimax: [
    '/cinemas/Cineplex Cinemas Mississauga & IMAX_01.png',
    '/cinemas/Cineplex Cinemas Mississauga & IMAX_02.png',
  ],
  esquireimaxtheatre: ['/cinemas/Esquire IMAX Theatre_02.jpg'],
  harkinsarizonamills18imax: [
    '/cinemas/Harkins Arizona Mills 18 & IMAX_01.jpg',
    '/cinemas/Harkins Arizona Mills 18 & IMAX_02.jpeg',
  ],
  imaxtheatreatindianastatemuseum: ['/cinemas/IMAX Theatre at Indiana State Museum_01.jpg'],
  imaxmelbournemuseum: ['/cinemas/IMAX, Melbourne Museum_02.jpg'],
  regaledwardsontariopalaceimax: [
    '/cinemas/Regal Edwards Ontario Palace & IMAX_01.jpg',
    '/cinemas/Regal Edwards Ontario Palace & IMAX_02.jpg',
  ],
  regalhaciendacrossings: ['/cinemas/Regal Hacienda Crossings_02.jpg'],
  regalirvinespectrum: ['/cinemas/Regal Irvine Spectrum_01.jpg'],
  regalmallofgeorgiaimax: ['/cinemas/Regal Mall of Georgia & IMAX_01.jpg', '/cinemas/Regal Mall of Georgia & IMAX_02.jpg'],
  regaloprymills: ['/cinemas/Regal Opry Mills_01.jpg', '/cinemas/Regal Opry Mills_02.jpg'],
}

function normalizeCinemaName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function getCinemaImages(name: string): string[] {
  const key = normalizeCinemaName(name)
  if (CINEMA_IMAGES[key]?.length) return CINEMA_IMAGES[key]!

  // Fallback: best prefix match (handles sufixos como "Stadium" vs "IMAX")
  let best: string[] | null = null
  let bestScore = 0
  Object.entries(CINEMA_IMAGES).forEach(([k, imgs]) => {
    const maxLen = Math.min(k.length, key.length)
    let prefix = 0
    while (prefix < maxLen && k[prefix] === key[prefix]) prefix += 1
    if (prefix > bestScore && prefix >= 8) {
      bestScore = prefix
      best = imgs
    }
  })

  return best ?? ['/sala-cinema.png']
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
      description: ['TICKET VIP Center-Optic Premium Seat','Priority Entry Lane', 'Spartan Helmet Lego Limited ', 'Collectible Commemorative Ticket','Official Launch Poster','Commander’s Insignia (Enamel Pin)','VIP Access Wristband'],
      amount: 0,
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 34900,
      description: ['TICKET STANDART IMAX 70mm Seat', 'Digital Entry Pass (QR Code)'],
      amount: 0,
    },
  ])

  const cinemaImages = useMemo(
    () => (selectedCinema ? getCinemaImages(selectedCinema.name) : ['/sala-cinema.png']),
    [selectedCinema],
  )
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    setCurrentImage(0)
  }, [cinemaImages])
  useEffect(() => {
    if (cinemaImages.length < 2) return
    const id = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % cinemaImages.length)
    }, 2000)
    return () => clearInterval(id)
  }, [cinemaImages])

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
          const startLabel = start.toLocaleTimeString([], {
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
    <div className="min-h-screen text-white relative overflow-hidden ">
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
              key={cinemaImages[currentImage]}
              src={cinemaImages[currentImage]}
              alt={selectedCinema.name}
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover"
              priority
            />

            <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent z-10" />

            {cinemaImages.length > 1 && (
              <div className="absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-2">
                {cinemaImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className={`h-2 w-2 rounded-full border border-white/50 transition ${idx === currentImage ? 'bg-white' : 'bg-white/30'}`}
                    aria-label={`View image ${idx + 1}`}
                  />
                ))}
              </div>
            )}
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
              Choose seats
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
