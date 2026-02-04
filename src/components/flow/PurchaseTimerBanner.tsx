'use client'

import { Clock } from 'lucide-react'
import { useCheckoutTimer } from './CheckoutTimerProvider'
import { cn } from '@/lib/utils'

interface PurchaseTimerBannerProps {
  className?: string
}

export function PurchaseTimerBanner({ className }: PurchaseTimerBannerProps) {
  const { remainingSeconds, status, isOnFlowPage } = useCheckoutTimer()

  // Don't show if not on flow page or if expired
  if (!isOnFlowPage || status === 'expired') return null

  // Don't show if timer hasn't started (remainingSeconds = 0 and status = active means not started)
  if (remainingSeconds === 0 && status === 'active') return null

  // Format time as MM:SS
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  // Determine urgency level for styling
  const isUrgent = remainingSeconds <= 60 && remainingSeconds > 0
  const isCritical = remainingSeconds <= 30 && remainingSeconds > 0

  return (
    <div
      className={cn(
        'w-full py-3 px-4',
        'bg-gray-900/80 backdrop-blur-md border-b border-gray-800',
        'flex items-center justify-center gap-2',
        'text-sm font-medium',
        'transition-colors duration-300',
        isUrgent && !isCritical && 'bg-amber-900/50 border-amber-700',
        isCritical && 'bg-red-900/50 border-red-700 animate-pulse',
        className
      )}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      <Clock
        className={cn(
          'w-4 h-4',
          'text-gray-400',
          isUrgent && !isCritical && 'text-amber-400',
          isCritical && 'text-red-400'
        )}
      />
      <span className="text-gray-300">
        Para garantir seu lugar, finalize em{' '}
        <span
          className={cn(
            'font-bold tabular-nums',
            'text-white',
            isUrgent && !isCritical && 'text-amber-300',
            isCritical && 'text-red-300'
          )}
        >
          {timeDisplay}
        </span>
        {' '}minutos.
      </span>
    </div>
  )
}
