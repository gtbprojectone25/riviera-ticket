'use client'

import { useCountdown } from '@/hooks/use-countdown'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  onExpired?: () => void
  className?: string
}

/**
 * Countdown timer component for ticket reservation timeout
 * Automatically redirects user when time expires
 */
export function CountdownTimer({ onExpired, className }: CountdownTimerProps) {
  const router = useRouter()

  const handleExpired = () => {
    // Clear any existing cart
    localStorage.removeItem('riviera-cart')
    
    // Call optional callback
    onExpired?.()
    
    // Redirect to queue/expired page
    router.push('/queue-expired')
  }

  const { minutes, seconds, expired, formattedTime } = useCountdown(10, handleExpired)

  // Show warning when less than 2 minutes remain
  const isWarning = minutes < 2 && !expired
  const isCritical = minutes === 0 && seconds <= 30 && !expired

  if (expired) {
    return (
      <Alert className="border-red-500 bg-red-50">
        <Clock className="h-4 w-4 text-red-500" />
        <AlertDescription className="text-red-700">
          Your session has expired. You will be redirected to the queue.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Clock className={cn(
        "h-5 w-5",
        isCritical ? "text-red-500 animate-pulse" : 
        isWarning ? "text-yellow-500" : "text-blue-500"
      )} />
      <div className="flex flex-col">
        <span className={cn(
          "text-lg font-mono font-bold",
          isCritical ? "text-red-500 animate-pulse" : 
          isWarning ? "text-yellow-500" : "text-blue-500"
        )}>
          {formattedTime}
        </span>
        <span className="text-xs text-muted-foreground">
          Time remaining to complete purchase
        </span>
      </div>
      
      {isWarning && (
        <Alert className={cn(
          "ml-4",
          isCritical ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"
        )}>
          <AlertDescription className={cn(
            isCritical ? "text-red-700" : "text-yellow-700"
          )}>
            {isCritical 
              ? "⚠️ Less than 30 seconds remaining!" 
              : "⏰ Less than 2 minutes remaining!"}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}