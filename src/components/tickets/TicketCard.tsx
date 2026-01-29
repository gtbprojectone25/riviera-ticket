'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export type TicketCardProps = {
  type: 'STANDARD' | 'VIP'
  orderId: string
  movie: string
  date: string
  time: string
  seat: string
  cinema: string
  cinemaAddress: string
  barcode: string
  screenType: string
}

export function TicketCard({
  type,
  orderId,
  movie,
  date,
  time,
  seat,
  cinema,
  cinemaAddress,
  barcode,
  screenType,
}: TicketCardProps) {
  const isVip = type === 'VIP'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border',
        isVip ? 'bg-[#0A0A0A] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900',
        'shadow-xl',
      )}
    >
      {/* ruido leve para VIP */}
      {isVip && (
        <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15),transparent_0)]ize:4px_4px]" />
      )}

      {/* Barra superior gradiente */}
      <div className="relative flex items-center justify-between px-4 py-3 text-xs font-semibold tracking-wide text-white">
        <div className="absolute inset-0 bg-linear-to-r from-[#44A4FF] via-[#C34EFF] to-[#FF8056]" />
        <span className="relative z-10 uppercase">{type === 'VIP' ? 'VIP' : 'STANDARD'}</span>
        <span className="relative z-10 uppercase">{screenType || 'IMAX'}</span>
      </div>

      {/* Corpo */}
      <div className={cn('relative p-6', isVip ? 'text-gray-100' : 'text-gray-900')}>
        {/* Perfurado nas laterais */}
        <div className="pointer-events-none absolute left-0 top-24 h-10 w-5 rounded-r-full bg-black/70 opacity-20" />
        <div className="pointer-events-none absolute right-0 top-24 h-10 w-5 rounded-l-full bg-black/70 opacity-20" />

        <p className={cn('text-xs font-medium uppercase', isVip ? 'text-gray-300' : 'text-gray-500')}>
          Order ID
        </p>
        <p className="text-xl font-bold tracking-wide mt-1">
          #{orderId.slice(0, 8).toUpperCase()}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Info label="Movie" value={movie} vip={isVip} />
          <Info label="Date" value={date} vip={isVip} />
          <Info label="Seat" value={seat} vip={isVip} />
          <Info label="Time" value={time} vip={isVip} />
        </div>

        <div className="mt-4">
          <Info label="Exhibition location" value={cinema} vip={isVip} />
          <p className={cn('text-xs', isVip ? 'text-gray-400' : 'text-gray-500')}>
            {cinemaAddress}
          </p>
        </div>

        {/* Linha tracejada */}
        <div className={cn('my-6 border-t border-dashed', isVip ? 'border-gray-700' : 'border-gray-300')} />

        {/* Barcode blur */}
        <div className="bg-black/5 rounded-lg p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={barcode}
            alt="Barcode"
            className="w-full h-12 object-contain filter blur-sm opacity-70"
          />
        </div>

        <p className={cn('mt-3 text-xs leading-relaxed', isVip ? 'text-gray-400' : 'text-gray-500')}>
          The barcode is for demonstration purposes only. For greater security, the official code will
          be made available 2 weeks before the premiere date.
        </p>
      </div>
    </div>
  )
}

function Info({
  label,
  value,
  vip,
}: {
  label: string
  value: string
  vip: boolean
}) {
  return (
    <div className="space-y-1">
      <p className={cn('text-xs font-medium uppercase', vip ? 'text-gray-300' : 'text-gray-500')}>
        {label}
      </p>
      <p className={cn('text-sm font-semibold', vip ? 'text-white' : 'text-gray-900')}>
        {value}
      </p>
    </div>
  )
}
