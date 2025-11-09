import { useState, useEffect, useCallback } from 'react'
import { getTimeRemaining } from '@/lib/utils'

/**
 * Custom hook for countdown timer functionality
 * @param initialMinutes - Initial countdown time in minutes
 * @param onExpired - Callback when timer expires
 * @returns Timer state and control functions
 */
export function useCountdown(initialMinutes: number = 10, onExpired?: () => void) {
  const [targetTime, setTargetTime] = useState<number>(() => 
    Date.now() + (initialMinutes * 60 * 1000)
  )
  const [timeRemaining, setTimeRemaining] = useState(() => 
    getTimeRemaining(targetTime)
  )
  const [isActive, setIsActive] = useState(true)

  // Update timer every second
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      const remaining = getTimeRemaining(targetTime)
      setTimeRemaining(remaining)

      if (remaining.expired) {
        setIsActive(false)
        onExpired?.()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [targetTime, isActive, onExpired])

  // Reset timer to initial value
  const resetTimer = useCallback(() => {
    const newTarget = Date.now() + (initialMinutes * 60 * 1000)
    setTargetTime(newTarget)
    setTimeRemaining(getTimeRemaining(newTarget))
    setIsActive(true)
  }, [initialMinutes])

  // Pause timer
  const pauseTimer = useCallback(() => {
    setIsActive(false)
  }, [])

  // Resume timer
  const resumeTimer = useCallback(() => {
    setIsActive(true)
  }, [])

  // Add time to current timer
  const addTime = useCallback((additionalMinutes: number) => {
    const newTarget = targetTime + (additionalMinutes * 60 * 1000)
    setTargetTime(newTarget)
    setTimeRemaining(getTimeRemaining(newTarget))
  }, [targetTime])

  return {
    minutes: timeRemaining.minutes,
    seconds: timeRemaining.seconds,
    expired: timeRemaining.expired,
    isActive,
    resetTimer,
    pauseTimer,
    resumeTimer,
    addTime,
    formattedTime: `${timeRemaining.minutes.toString().padStart(2, '0')}:${timeRemaining.seconds.toString().padStart(2, '0')}`
  }
}