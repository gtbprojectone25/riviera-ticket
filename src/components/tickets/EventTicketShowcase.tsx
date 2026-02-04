'use client'

import { useMemo, useState } from 'react'
import type { AccountEvent } from '@/types/account'
import { TicketCard3D } from '@/components/tickets/TicketCard3D'
import { cn } from '@/lib/utils'

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
    year: 'numeric'
  })
  const timeLabel = start.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Usa os primeiros 12 caracteres do ID (cartId ou ticketId) para identificar a compra
  const orderId = event.id.replace(/-/g, '').slice(0, 12).toUpperCase()
  const ticketType: 'STANDARD' | 'VIP' =
    event.type === 'VIP' ? 'VIP' : 'STANDARD'

  return (
    <section
      className={cn(
        'rounded-touch-lg space-y-16',
        className,
      )}
    >
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
