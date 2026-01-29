'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Clock } from 'lucide-react'
import { useBookingStore } from '@/stores/booking'
import { SeatMap } from '../seat-selection/SeatMap'
import { useSessionSeats } from '../seat-selection/useSessionSeats'
import {
  PremiumTicketSummary,
  FeatureCards,
  BuyerGuarantee,
} from './_components/premium-summary'
import { formatCurrency } from '@/lib/utils'

type SessionApi = {
  id: string
  startTime: string
  endTime: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const selectedCinema = useBookingStore((s) => s.selectedCinema)
  const finalizedTickets = useBookingStore((s) => s.finalizedTickets)
  const selectedSessionId = useBookingStore((s) => s.selectedSessionId)

  const { rows: seatRows } = useSessionSeats({ sessionId: selectedSessionId })

  const [session, setSession] = useState<SessionApi | null>(null)

  // Proteção de rota
  useEffect(() => {
    if (!finalizedTickets || finalizedTickets.length === 0) {
      router.push('/seat-selection')
    }
  }, [finalizedTickets, router])

  // Buscar dados da sessão selecionada para data/horário
  useEffect(() => {
    if (!selectedSessionId) return

    const controller = new AbortController()

    const load = async () => {
      try {
        const res = await fetch(`/api/sessions/${selectedSessionId}`, {
          signal: controller.signal,
        })

        if (!res.ok) return

        const data = (await res.json()) as SessionApi
        setSession(data)
      } catch {
        // silencioso no checkout
      }
    }

    void load()

    return () => controller.abort()
  }, [selectedSessionId])

  // Dados derivados
  const totalAmountCents = finalizedTickets.reduce((acc, t) => acc + t.price, 0)
  const selectedSeatIds = finalizedTickets
    .map((t) => t.assignedSeatId)
    .filter(Boolean) as string[]

  const summaryTickets = useMemo(() => {
    const grouped = finalizedTickets.reduce<
      Record<string, { id: string; name: string; price: number; amount: number }>
    >((acc, t) => {
      const baseName = t.name.replace(/ #\d+$/, '')
      const key = t.type + t.price

      if (!acc[key]) {
        acc[key] = {
          id: t.type,
          name: baseName,
          price: t.price,
          amount: 0,
        }
      }
      acc[key].amount += 1
      return acc
    }, {})

    return Object.values(grouped)
  }, [finalizedTickets])

  const sessionDateLabel = useMemo(() => {
    if (!session) return 'To be defined'
    const start = new Date(session.startTime)
    return start.toLocaleDateString()
  }, [session])

  const sessionTimeLabel = useMemo(() => {
    if (!session) return 'To be defined'
    const start = new Date(session.startTime)
    const end = new Date(session.endTime)
    const startLabel = start.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    const endLabel = end.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${startLabel} at ${endLabel}`
  }, [session])

  if (!selectedCinema) return null

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden bg-black/60">


      <div className="relative z-10 flex flex-col items-center min-h-screen pt-6">
        
        <div className="w-full max-w-md space-y-6 relative rounded-xl p-6 bg-[linear-gradient(to_top,#050505_0%,#080808_25%,#0A0A0A_45%,#0D0D0D_65%,#111111_80%,#181818_100%)] pb-32">
           {/* Urgency Banner */}
          <div className="w-full bg-[#0266FC] p-3 flex items-center justify-center rounded-lg">
            <Clock className="h-4 w-4 text-white shrink-0 mr-2" />
            <p className="text-white text-xs font-medium text-center">
              To guarantee your place, finish within 10:00 minutes.
            </p>
          </div>
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-500 hover:text-white transition-colors text-sm mb-2 group w-fit"
          >
            <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            To go back
          </button>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white">Order summary</h1>

          {/* Divider */}
          <div className="h-px bg-white/10 w-full" />

          {/* Summary List */}
          <div className="space-y-6">
            {/* Pre-Sale */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                Pre-Sale
              </span>
              <span className="text-base text-white font-bold">
                Die Odyssee
              </span>
            </div>

            {/* Exhibition Location */}
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">
                Exhibition location
              </span>
              <div className="text-right">
                <div className="text-base text-white font-bold">
                  {selectedCinema.name || 'Roxy Cinema'}
                </div>
                <div className="text-xs text-gray-500 mt-1 max-w-[180px] leading-relaxed">
                  {selectedCinema.address ||
                    `${selectedCinema.city}, ${selectedCinema.state}`}
                </div>
              </div>
            </div>

            {/* Ticket Details */}
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">
                Ticket Details
              </span>
              <div className="text-right">
                <div className="text-base text-white font-bold">
                  {finalizedTickets.length} Premium Ticket
                </div>
                <div className="text-xs text-gray-500 mt-1 max-w-[180px] leading-relaxed">
                  Tickets are available the week of the premiere
                </div>
              </div>
            </div>

            {/* Session Date */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                Session date
              </span>
              <span className="text-base text-white font-bold">
                {sessionDateLabel}
              </span>
            </div>

            {/* Session Time */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                Session time
              </span>
              <span className="text-base text-white font-bold">
                {sessionTimeLabel}
              </span>
            </div>
          </div>

          {/* Your Accent (Seats) */}
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                Your Accent
              </h3>
              <p className="text-base text-white font-bold">
                {selectedSeatIds.join(' | ')}
              </p>
            </div>

            {/* Map Visualization */}
            <div className="w-full bg-[#111] rounded-xl border border-white/5 p-3 min-h-[300px] flex items-center justify-center">
              <SeatMap
                rows={seatRows}
                selectedSeats={selectedSeatIds}
                onSeatClick={() => {}}
                allowedTypes={[]}
                maxSelectable={0}
                readOnly={true}
              />
            </div>
          </div>

          {/* Premium Ticket Summary */}
          <div className="mt-8">
            <PremiumTicketSummary tickets={summaryTickets} />
          </div>

          {/* Feature Cards */}
          <div className="mt-8">
            <FeatureCards />
          </div>

          {/* Buyer Guarantee */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <BuyerGuarantee />
          </div>

          {/* Go to Payment Button */}
          <div className="fixed bottom-0 left-0 w-full p-4 bg-linear-to-t from-black via-black to-transparent pt-10 z-30 max-w-md mx-auto right-0">
            <Button
              className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white h-12 rounded-xl text-base font-semibold shadow-lg transition-all active:scale-[0.98]"
              onClick={() => {
                router.push('/register?returnUrl=/payment')
              }}
            >
              Go to payment {formatCurrency(totalAmountCents)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
