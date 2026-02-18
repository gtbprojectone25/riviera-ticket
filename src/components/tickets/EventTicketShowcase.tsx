'use client'

import { useMemo, useState, useRef } from 'react'
import type { AccountEvent } from '@/types/account'
import { TicketCard3D } from '@/components/tickets/TicketCard3D'
import { cn } from '@/lib/utils'

// ── Versão multi-ticket: aceita lista de events (um por ticket) ──────────────

interface MultiTicketShowcaseProps {
  events: AccountEvent[]
  className?: string
}

export function MultiTicketShowcase({ events, className }: MultiTicketShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  const safeIndex = Math.min(activeIndex, events.length - 1)

  const handleSelect = (index: number) => {
    if (index === safeIndex) return
    // Fade-out → troca → fade-in
    setVisible(false)
    setTimeout(() => {
      setActiveIndex(index)
      setVisible(true)
    }, 220)
  }

  if (events.length === 0) return null

  const activeEvent = events[safeIndex]

  return (
    <section className={cn('space-y-6', className)}>
      {/* Botões de navegação — Ticket 1, 2, 3… */}
      <div className="flex justify-center gap-2 flex-wrap px-2">
        {events.map((ev, index) => (
          <button
            key={ev.id}
            type="button"
            onClick={() => handleSelect(index)}
            className={cn(
              'h-10 min-w-24 rounded-full px-4 text-sm font-semibold transition-all duration-200',
              index === safeIndex
                ? 'bg-[#2563EB] text-white scale-105 shadow-lg shadow-blue-500/30'
                : 'bg-[#1F2937] text-gray-300 hover:bg-[#2B3647]',
            )}
          >
            Ticket {index + 1}
          </button>
        ))}
      </div>

      {/* Um ticket por vez com fade */}
      <div
        style={{
          transition: 'opacity 220ms ease, transform 220ms ease',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.96)',
        }}
      >
        <TicketEventCard key={activeEvent.id} event={activeEvent} />
      </div>
    </section>
  )
}

// ── Card individual ───────────────────────────────────────────────────────────

function TicketEventCard({ event }: { event: AccountEvent }) {
  const start = useMemo(() => new Date(event.sessionTime), [event.sessionTime])
  const dateLabel = start.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const timeLabel = start.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const orderId = event.id.replace(/-/g, '').slice(0, 12).toUpperCase()
  const ticketType: 'STANDARD' | 'VIP' = event.type === 'VIP' ? 'VIP' : 'STANDARD'
  const seatLabel = event.seatLabels?.[0] ?? 'Seat TBD'

  return (
    <TicketCard3D
      type={ticketType}
      orderId={orderId}
      movie={event.movieTitle}
      date={dateLabel}
      time={timeLabel}
      seat={seatLabel}
      cinema={event.cinemaName}
      cinemaAddress={event.cinemaAddress}
      barcode={event.barcode}
      screenType="IMAX"
      className="max-w-md mx-auto"
    />
  )
}

// ── Versão legada (compatibilidade): recebe 1 event com vários seatLabels ────

export function EventTicketShowcase({
  event,
  className,
}: {
  event: AccountEvent
  className?: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const seats = event.seatLabels?.length ? event.seatLabels : ['Seat TBD']
  const safeIndex = Math.min(activeIndex, seats.length - 1)

  const start = useMemo(() => new Date(event.sessionTime), [event.sessionTime])
  const dateLabel = start.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const timeLabel = start.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const orderId = event.id.replace(/-/g, '').slice(0, 12).toUpperCase()
  const ticketType: 'STANDARD' | 'VIP' = event.type === 'VIP' ? 'VIP' : 'STANDARD'

  return (
    <section className={cn('rounded-touch-lg space-y-16', className)}>
      <div className="flex justify-center gap-touch-2 pb-2">
        {seats.map((_, index) => (
          <button
            key={`${event.id}-ticket-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={cn(
              'h-10 min-w-24 rounded-full px-3 text-caption font-semibold transition-colors',
              index === safeIndex
                ? 'bg-[#2563EB] text-white'
                : 'bg-[#1F2937] text-gray-300 hover:bg-[#2B3647]',
            )}
          >
            Ticket {index + 1}
          </button>
        ))}
      </div>

      <TicketCard3D
        key={`${event.id}-${safeIndex}`}
        type={ticketType}
        orderId={orderId}
        movie={event.movieTitle}
        date={dateLabel}
        time={timeLabel}
        seat={seats[safeIndex]}
        cinema={event.cinemaName}
        cinemaAddress={event.cinemaAddress}
        barcode={event.barcode}
        screenType="IMAX"
        className="max-w-md mx-auto ticket-fade-in mb-16"
      />
    </section>
  )
}
