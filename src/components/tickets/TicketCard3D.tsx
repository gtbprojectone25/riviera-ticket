'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

export type TicketCard3DProps = {
  type: 'STANDARD' | 'VIP'
  orderId: string
  movie: string
  date: string
  time: string
  seat: string
  cinema: string
  cinemaAddress?: string
  barcode?: string
  barcodeBlurred?: string
  screenType?: string
  className?: string
}

type Rotation = { x: number; y: number }

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const isBarcodeImage = (value?: string) =>
  !!value && /^(data:|https?:|\/)/i.test(value)

export function TicketCard3D({
  type,
  orderId,
  movie,
  date,
  time,
  seat,
  cinema,
  cinemaAddress,
  barcode,
  barcodeBlurred,
  screenType,
  className,
}: TicketCard3DProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const currentRotation = useRef<Rotation>({ x: 0, y: 0 })
  const dragRotation = useRef<Rotation>({ x: 0, y: 0 })
  const dragStart = useRef({ x: 0, y: 0, baseX: 0, baseY: 0 })
  const isDragging = useRef(false)
  const isPaused = useRef(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [dragging, setDragging] = useState(false)

  const isVip = type === 'VIP'
  const barcodeSource = barcodeBlurred || barcode
  const showBarcodeImage = isBarcodeImage(barcodeSource)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setPrefersReducedMotion(media.matches)
    handleChange()
    if (media.addEventListener) {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }
    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  useEffect(() => {
    let rafId = 0
    let currentFlip = 0

    const animate = (time: number) => {
      const seconds = time / 1000
      const autoRotation: Rotation = prefersReducedMotion
        ? { x: 0, y: 0 }
        : {
            x: Math.cos(seconds * 0.4) * 3,
            y: Math.sin(seconds * 0.5) * 12,
          }

      const target = isDragging.current ? dragRotation.current : autoRotation

      currentRotation.current.x +=
        (target.x - currentRotation.current.x) * 0.08
      currentRotation.current.y +=
        (target.y - currentRotation.current.y) * 0.08

      // Continuous rotation (pausa quando estiver sendo pressionado)
      if (!prefersReducedMotion && !isPaused.current) {
        currentFlip += 0.3 // Speed of rotation (degrees per frame)
      }

      if (cardRef.current) {
        cardRef.current.style.transform = `rotateX(${currentRotation.current.x}deg) rotateY(${currentRotation.current.y + currentFlip}deg)`
      }

      rafId = window.requestAnimationFrame(animate)
    }

    rafId = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(rafId)
  }, [prefersReducedMotion])


  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    isDragging.current = true
    isPaused.current = true // Pausa a rotação ao pressionar
    setDragging(true)
    event.preventDefault()
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      baseX: currentRotation.current.x,
      baseY: currentRotation.current.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    event.preventDefault()
    const deltaX = event.clientX - dragStart.current.x
    const deltaY = event.clientY - dragStart.current.y
    dragRotation.current = {
      x: clamp(dragStart.current.baseX - deltaY * 0.15, -12, 12),
      y: clamp(dragStart.current.baseY + deltaX * 0.2, -18, 18),
    }
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    isDragging.current = false
    isPaused.current = false // Retoma a rotação ao soltar
    setDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div
      className={cn(
        'relative select-none touch-pan-y',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
        className,
      )}
      style={{ perspective: '1200px', touchAction: dragging ? 'none' : 'pan-y' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        isDragging.current = false
        isPaused.current = false
        setDragging(false)
      }}
      onPointerCancel={() => {
        isDragging.current = false
        isPaused.current = false
        setDragging(false)
      }}
    >
      <div
        ref={cardRef}
        className={cn(
          'relative mx-auto w-full max-w-[280px] overflow-hidden rounded-[18px] border will-change-transform',
          isVip
            ? 'bg-linear-to-br from-[#0A0E1C] via-[#141B2E] to-[#0F1524] border-[#2563EB]/20 text-white shadow-[0_24px_60px_rgba(37,99,235,0.35),0_8px_16px_rgba(0,0,0,0.5)]'
            : 'bg-linear-to-br from-white via-[#F8F9FF] to-[#EEF2FF] border-[#2563EB]/15 text-gray-900 shadow-[0_20px_50px_rgba(37,99,235,0.18),0_8px_16px_rgba(15,23,42,0.12)]',
        )}
        style={{ transformStyle: 'preserve-3d', minHeight: '560px' }}
      >
        {/* edge cutouts to mimic ticket shape */}
        <div className="pointer-events-none absolute left-0 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0B0F1A]" />
        <div className="pointer-events-none absolute right-0 top-1/2 h-12 w-12 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0B0F1A]" />

        {/* Holographic gradient overlay */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(37,99,235,0.3) 25%, rgba(14,165,233,0.3) 50%, rgba(168,85,247,0.3) 75%, rgba(124,58,237,0.3) 100%)',
            backgroundSize: '200% 200%',
            animation: 'holographic 6s ease-in-out infinite',
          }}
        />

        {/* Metallic shine */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 h-64 bg-linear-to-b from-white/25 via-white/5 to-transparent',
            isVip ? 'opacity-40' : 'opacity-60',
          )}
          style={{
            transform: 'translateY(-20%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: isVip 
              ? 'radial-gradient(circle at 50% 0%, rgba(37,99,235,0.25) 0%, transparent 60%)'
              : 'radial-gradient(circle at 50% 0%, rgba(37,99,235,0.15) 0%, transparent 60%)',
          }}
        />

        {isVip && (
          <div className="ticket-grain pointer-events-none absolute inset-0 opacity-8" />
        )}

        <div className="relative px-6 pt-6">
          <div className="flex items-center justify-between text-caption uppercase tracking-[0.24em]">
            <span className={cn('font-semibold', isVip ? 'text-white' : 'text-[#2563EB]')}>
              {isVip ? 'VIP' : 'STANDARD'}
            </span>
            <span className={cn('font-semibold', isVip ? 'text-white' : 'text-[#2563EB]')}>
              {screenType || 'IMAX'}
            </span>
          </div>
        </div>

        <div className="relative mt-touch-3 h-[3px] w-full overflow-hidden">
          <div 
            className="absolute inset-0 bg-linear-to-r from-[#2563EB] via-[#7C3AED] to-[#F59E0B]" 
            style={{
              animation: 'shimmer 3s linear infinite',
              backgroundSize: '200% 100%',
            }}
          />
        </div>

        <div className="relative px-6 py-6 space-y-4">
          <div className="space-y-3">
            <Info label="Movie" value={movie} vip={isVip} />
            <Info label="Order ID" value={`#${orderId}`} vip={isVip} />
          </div>

          <div
            className={cn(
              'border-t border-dashed',
              isVip ? 'border-white/25' : 'border-gray-300',
            )}
          />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Date" value={date} vip={isVip} />
            <Info label="Time" value={time} vip={isVip} />
            <Info label="Seat" value={seat} vip={isVip} />
            <div className="space-y-1">
              <p className={cn('text-caption uppercase tracking-[0.12em]', isVip ? 'text-gray-300' : 'text-gray-500')}>
                Cinema
              </p>
              <p className={cn('text-xs font-semibold', isVip ? 'text-white' : 'text-gray-900')}>
                {cinema}
              </p>
            </div>
          </div>

          {cinemaAddress && (
            <p className={cn('text-[10px] leading-tight', isVip ? 'text-gray-400' : 'text-gray-500')}>
              {cinemaAddress}
            </p>
          )}

          <div
            className={cn(
              'border-t border-dashed',
              isVip ? 'border-white/25' : 'border-gray-300',
            )}
          />

          <div className="space-y-2">
            <div
              className={cn(
                'relative overflow-hidden rounded-lg p-3',
                isVip ? 'bg-white/5' : 'bg-[#F6F7FB]',
              )}
            >
              {showBarcodeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={barcodeSource}
                  alt="Barcode"
                  className="h-14 w-full object-cover blur-md opacity-75"
                />
              ) : (
                <div
                  className="h-14 w-full rounded-sm opacity-80 blur-[2px]"
                  style={{
                    backgroundImage: `repeating-linear-gradient(90deg, ${
                      isVip ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'
                    } 0, ${
                      isVip ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'
                    } 2px, transparent 2px, transparent 4px)`,
                  }}
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <p className={cn('text-[10px] leading-relaxed text-center', isVip ? 'text-gray-300' : 'text-gray-500')}>
              The barcode is for demonstration purposes only. For greater security, the official code will be made available 2 weeks before the premiere date.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value, vip }: { label: string; value: string; vip: boolean }) {
  return (
    <div className="space-y-1">
      <p className={cn('text-caption uppercase tracking-[0.12em]', vip ? 'text-gray-300' : 'text-gray-500')}>
        {label}
      </p>
      <p className={cn('text-base font-semibold', vip ? 'text-white' : 'text-gray-900')}>
        {value}
      </p>
    </div>
  )
}
