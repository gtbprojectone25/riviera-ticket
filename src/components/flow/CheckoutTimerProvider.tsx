'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
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

// Pages that are part of the purchase flow (from pre-order until payment)
const FLOW_PAGES = [
  '/pre-order',
  '/location',
  '/sessions',
  '/ticket-selection',
  '/seat-selection',
  '/checkout',
  '/register',
  '/payment',
]

function normalizePath(pathname: string | null): string {
  if (!pathname) return ''
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

type TimerStatus = 'active' | 'popup' | 'expired'

type TimerState = {
  remainingSeconds: number
  status: TimerStatus
  hasExtended: boolean
  popupCountdown: number
  initialized: boolean
}

type TimerAction =
  | { type: 'HYDRATE'; remainingSeconds: number | null; hasExtended: boolean }
  | { type: 'TICK_MAIN' }
  | { type: 'ENTER_POPUP' }
  | { type: 'TICK_POPUP' }
  | { type: 'START_TIMER' }
  | { type: 'EXTEND_TIMER' }
  | { type: 'CLEAR_FLOW' }

const initialTimerState: TimerState = {
  remainingSeconds: 0,
  status: 'active',
  hasExtended: false,
  popupCountdown: EXTENSION_POPUP_SECONDS,
  initialized: false,
}

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'HYDRATE': {
      if (action.remainingSeconds === null) {
        return { ...state, initialized: true }
      }

      return {
        ...state,
        remainingSeconds: action.remainingSeconds,
        hasExtended: action.hasExtended,
        status: action.remainingSeconds <= 0 ? 'popup' : 'active',
        popupCountdown: EXTENSION_POPUP_SECONDS,
        initialized: true,
      }
    }
    case 'TICK_MAIN':
      if (state.status === 'expired') return state
      return { ...state, remainingSeconds: Math.max(state.remainingSeconds - 1, 0) }
    case 'ENTER_POPUP':
      if (state.status !== 'active' || state.remainingSeconds > 0) return state
      return {
        ...state,
        status: 'popup',
        popupCountdown: EXTENSION_POPUP_SECONDS,
      }
    case 'TICK_POPUP':
      if (state.status !== 'popup') return state
      return { ...state, popupCountdown: Math.max(state.popupCountdown - 1, 0) }
    case 'START_TIMER':
      return {
        ...state,
        remainingSeconds: INITIAL_TIMER_MINUTES * 60,
        status: 'active',
        hasExtended: false,
        popupCountdown: EXTENSION_POPUP_SECONDS,
      }
    case 'EXTEND_TIMER':
      if (state.hasExtended) return state
      return {
        ...state,
        remainingSeconds: EXTENSION_MINUTES * 60,
        status: 'active',
        hasExtended: true,
        popupCountdown: EXTENSION_POPUP_SECONDS,
      }
    case 'CLEAR_FLOW':
      return {
        ...state,
        remainingSeconds: 0,
        status: 'expired',
        hasExtended: false,
      }
    default:
      return state
  }
}

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

  const [state, dispatch] = useReducer(timerReducer, initialTimerState)

  const popupTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Check if current page is part of the flow.
  // Exact-match only to avoid leaking timer popup to non-flow routes like /payment/success.
  const normalizedPathname = normalizePath(pathname)
  const isOnFlowPage = FLOW_PAGES.includes(normalizedPathname)

  // Load initial state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedExpiresAt = localStorage.getItem(STORAGE_KEY_EXPIRES_AT)
    const storedExtended = localStorage.getItem(STORAGE_KEY_EXTENDED)

    if (storedExpiresAt) {
      const expiresAt = parseInt(storedExpiresAt, 10)
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))

      dispatch({
        type: 'HYDRATE',
        remainingSeconds: remaining,
        hasExtended: storedExtended === 'true',
      })
      return
    }

    dispatch({ type: 'HYDRATE', remainingSeconds: null, hasExtended: false })
  }, [])

  // Main countdown timer
  useEffect(() => {
    if (!state.initialized || !isOnFlowPage) return
    if (state.status === 'expired') return

    const interval = setInterval(() => {
      dispatch({ type: 'TICK_MAIN' })
    }, 1000)

    return () => clearInterval(interval)
  }, [state.initialized, isOnFlowPage, state.status])

  // Transition from active countdown to extension popup
  useEffect(() => {
    if (!state.initialized || !isOnFlowPage) return
    if (state.status !== 'active') return
    if (state.remainingSeconds > 0) return

    dispatch({ type: 'ENTER_POPUP' })
  }, [state.initialized, isOnFlowPage, state.status, state.remainingSeconds])

  // Popup countdown timer (10 seconds)
  useEffect(() => {
    if (state.status !== 'popup' || !isOnFlowPage) {
      if (popupTimerRef.current) {
        clearInterval(popupTimerRef.current)
        popupTimerRef.current = null
      }
      return
    }

    popupTimerRef.current = setInterval(() => {
      dispatch({ type: 'TICK_POPUP' })
    }, 1000)

    return () => {
      if (popupTimerRef.current) {
        clearInterval(popupTimerRef.current)
        popupTimerRef.current = null
      }
    }
  }, [state.status, isOnFlowPage])

  // Persist timer to localStorage
  const persistTimer = useCallback((expiresAt: number, extended: boolean) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY_EXPIRES_AT, expiresAt.toString())
    localStorage.setItem(STORAGE_KEY_EXTENDED, extended.toString())
  }, [])

  // Start the timer (10 minutes from now)
  const startTimer = useCallback(() => {
    const expiresAt = Date.now() + INITIAL_TIMER_MINUTES * 60 * 1000
    dispatch({ type: 'START_TIMER' })
    persistTimer(expiresAt, false)
  }, [persistTimer])

  // Extend timer by 3 minutes
  const extendTimer = useCallback(() => {
    if (state.hasExtended) return

    const newExpiresAt = Date.now() + EXTENSION_MINUTES * 60 * 1000
    dispatch({ type: 'EXTEND_TIMER' })
    persistTimer(newExpiresAt, true)
  }, [state.hasExtended, persistTimer])

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

    dispatch({ type: 'CLEAR_FLOW' })
  }, [])

  // Handle expiration
  const handleExpire = useCallback(async () => {
    await clearFlow()
    router.push('/pre-order')
  }, [clearFlow, router])

  // Expire flow once popup countdown reaches zero
  useEffect(() => {
    if (state.status !== 'popup' || !isOnFlowPage) return
    if (state.popupCountdown > 0) return
    void handleExpire()
  }, [state.status, isOnFlowPage, state.popupCountdown, handleExpire])

  const value: CheckoutTimerContextType = {
    remainingSeconds: state.remainingSeconds,
    status: state.status,
    hasExtended: state.hasExtended,
    popupCountdown: state.popupCountdown,
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
