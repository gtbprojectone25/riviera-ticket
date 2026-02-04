'use client'

import { useEffect } from 'react'
import { useCheckoutTimer } from '@/components/flow'

/**
 * Hook to ensure the checkout timer is started when entering a flow page.
 * Call this at the top of flow page components.
 */
export function useEnsureFlowTimer() {
  const { remainingSeconds, status, startTimer, isOnFlowPage } = useCheckoutTimer()

  useEffect(() => {
    // If we're on a flow page and the timer hasn't started yet, start it
    if (isOnFlowPage && remainingSeconds === 0 && status === 'active') {
      // Check if there's an existing timer in localStorage
      const storedExpiresAt = localStorage.getItem('riviera_flow_expiresAt')
      if (!storedExpiresAt) {
        // No existing timer, start a new one
        startTimer()
      }
    }
  }, [isOnFlowPage, remainingSeconds, status, startTimer])

  return { remainingSeconds, status }
}
