'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'

// Timer constants
const INITIAL_TIMER_MINUTES = 10
const EXTENSION_MINUTES = 3
const EXTENSION_POPUP_SECONDS = 10

// Storage keys
const STORAGE_KEY_EXPIRES_AT = 'riviera_flow_expiresAt'
const STORAGE_KEY_EXTENDED = 'riviera_flow_extendedOnce'
const STORAGE_KEY_CART = 'riviera-cart'

// Pages that are part of the purchase flow
const FLOW_PAGES = [
  '/location',
  '/sessions',
  '/ticket-selection',
  '/seat-selection',
  '/checkout',
  '/register',
  '/payment',
]

type TimerStatus = 'active' | 'popup' | 'expired'

interface CheckoutTimerContextType {
  /** Remaining time in seconds */
  remainingSeconds: number
  /** Current timer status */
  status: TimerStatus
  /** Whether extension has been used */
  hasExtended: boolean
  /** Countdown for the extension popup (10s) */
  popupCountdown: number
  /** Start the timer (call when entering the flow) */
  startTimer: () => void
  /** Extend the timer by 3 minutes */
  extendTimer: () => void
  /** Clear the timer and flow data */
  clearFlow: () => void
  /** Check if currently on a flow page */
  isOnFlowPage: boolean
}

const CheckoutTimerContext = createContext<CheckoutTimerContextType | undefined>(undefined)

export function useCheckoutTimer() {
  const context = useContext(CheckoutTimerContext)
  if (!context) {
    throw new Error('useCheckoutTimer must be used within CheckoutTimerProvider')
  }
  return context
}

interface CheckoutTimerProviderProps {
  children: React.ReactNode
}

export function CheckoutTimerProvider({ children }: CheckoutTimerProviderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [remainingSeconds, setRemainingSeconds] = useState<number>(0)
  const [status, setStatus] = useState<TimerStatus>('active')
  const [hasExtended, setHasExtended] = useState<boolean>(false)
  const [popupCountdown, setPopupCountdown] = useState<number>(EXTENSION_POPUP_SECONDS)
  const [initialized, setInitialized] = useState(false)

  const popupTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Check if current page is part of the flow
  const isOnFlowPage = FLOW_PAGES.some(page => pathname?.startsWith(page))

  // Load initial state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedExpiresAt = localStorage.getItem(STORAGE_KEY_EXPIRES_AT)
    const storedExtended = localStorage.getItem(STORAGE_KEY_EXTENDED)

    if (storedExpiresAt) {
      const expiresAt = parseInt(storedExpiresAt, 10)
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))

      setRemainingSeconds(remaining)
      setHasExtended(storedExtended === 'true')

      if (remaining <= 0) {
        setStatus('popup')
        setPopupCountdown(EXTENSION_POPUP_SECONDS)
      }
    }

    setInitialized(true)
  }, [])

  // Main countdown timer
  useEffect(() => {
    if (!initialized || !isOnFlowPage) return
    if (status === 'expired') return

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          if (status === 'active') {
            setStatus('popup')
            setPopupCountdown(EXTENSION_POPUP_SECONDS)
            return 0
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [initialized, isOnFlowPage, status])

  // Popup countdown timer (10 seconds)
  useEffect(() => {
    if (status !== 'popup') {
      if (popupTimerRef.current) {
        clearInterval(popupTimerRef.current)
        popupTimerRef.current = null
      }
      return
    }

    popupTimerRef.current = setInterval(() => {
      setPopupCountdown(prev => {
        if (prev <= 1) {
          // Time's up, expire the flow
          handleExpire()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (popupTimerRef.current) {
        clearInterval(popupTimerRef.current)
        popupTimerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Persist timer to localStorage
  const persistTimer = useCallback((expiresAt: number, extended: boolean) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY_EXPIRES_AT, expiresAt.toString())
    localStorage.setItem(STORAGE_KEY_EXTENDED, extended.toString())
  }, [])

  // Start the timer (10 minutes from now)
  const startTimer = useCallback(() => {
    const expiresAt = Date.now() + INITIAL_TIMER_MINUTES * 60 * 1000
    setRemainingSeconds(INITIAL_TIMER_MINUTES * 60)
    setStatus('active')
    setHasExtended(false)
    setPopupCountdown(EXTENSION_POPUP_SECONDS)
    persistTimer(expiresAt, false)
  }, [persistTimer])

  // Extend timer by 3 minutes
  const extendTimer = useCallback(() => {
    if (hasExtended) return

    const newExpiresAt = Date.now() + EXTENSION_MINUTES * 60 * 1000
    setRemainingSeconds(EXTENSION_MINUTES * 60)
    setStatus('active')
    setHasExtended(true)
    setPopupCountdown(EXTENSION_POPUP_SECONDS)
    persistTimer(newExpiresAt, true)
  }, [hasExtended, persistTimer])

  // Clear flow data and release seats
  const clearFlow = useCallback(async () => {
    if (typeof window === 'undefined') return

    // Get cart data to release holds
    const cartData = localStorage.getItem(STORAGE_KEY_CART)
    if (cartData) {
      try {
        const cart = JSON.parse(cartData)
        if (cart.id && cart.sessionId && cart.seats?.length > 0) {
          const seatIds = cart.seats.map((s: { seatId: string }) => s.seatId)
          await fetch('/api/seats/release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cartId: cart.id,
              sessionId: cart.sessionId,
              seatIds,
            }),
          }).catch(() => {
            // Silent fail - seats will expire naturally
          })
        }
      } catch {
        // Silent fail
      }
    }

    // Clear all flow-related storage
    localStorage.removeItem(STORAGE_KEY_EXPIRES_AT)
    localStorage.removeItem(STORAGE_KEY_EXTENDED)
    localStorage.removeItem(STORAGE_KEY_CART)

    setRemainingSeconds(0)
    setStatus('expired')
    setHasExtended(false)
  }, [])

  // Handle expiration
  const handleExpire = useCallback(async () => {
    setStatus('expired')
    await clearFlow()
    router.push('/pre-order')
  }, [clearFlow, router])

  const value: CheckoutTimerContextType = {
    remainingSeconds,
    status,
    hasExtended,
    popupCountdown,
    startTimer,
    extendTimer,
    clearFlow,
    isOnFlowPage,
  }

  return (
    <CheckoutTimerContext.Provider value={value}>
      {children}
    </CheckoutTimerContext.Provider>
  )
}
