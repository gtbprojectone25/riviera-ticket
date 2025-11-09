import { useState, useEffect, useCallback } from 'react'
import type { Cart, CartSeat } from '@/types'
import { TICKET_LIMITS } from '@/types'

/**
 * Custom hook for managing cart state and operations
 * @returns Cart state and manipulation functions
 */
export function useCart() {
  // Initialize cart state with localStorage data
  const [cart, setCart] = useState<Cart | null>(() => {
    if (typeof window === 'undefined') return null
    
    const savedCart = localStorage.getItem('riviera-cart')
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        // Check if cart is still valid (not expired)
        if (new Date(parsedCart.expiresAt) > new Date()) {
          return parsedCart
        } else {
          localStorage.removeItem('riviera-cart')
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error)
        localStorage.removeItem('riviera-cart')
      }
    }
    return null
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart) {
      localStorage.setItem('riviera-cart', JSON.stringify(cart))
    } else {
      localStorage.removeItem('riviera-cart')
    }
  }, [cart])

  // Add seat to cart
  const addSeat = useCallback((sessionId: string, seat: CartSeat) => {
    setError(null)
    
    setCart(prevCart => {
      // If no cart exists, create new one
      if (!prevCart || prevCart.sessionId !== sessionId) {
        return {
          id: `cart_${Date.now()}`,
          sessionId,
          seats: [seat],
          totalAmount: seat.price,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + (TICKET_LIMITS.RESERVATION_TIMEOUT_MINUTES * 60 * 1000)),
          status: 'ACTIVE'
        }
      }

      // Check if seat already exists
      if (prevCart.seats.some(s => s.seatId === seat.seatId)) {
        setError('Seat already selected')
        return prevCart
      }

      // Check ticket limit
      if (prevCart.seats.length >= TICKET_LIMITS.MAX_TICKETS_PER_USER) {
        setError(`Maximum ${TICKET_LIMITS.MAX_TICKETS_PER_USER} tickets allowed per user`)
        return prevCart
      }

      // Add seat to cart
      const newSeats = [...prevCart.seats, seat]
      return {
        ...prevCart,
        seats: newSeats,
        totalAmount: newSeats.reduce((total, s) => total + s.price, 0)
      }
    })
  }, [])

  // Remove seat from cart
  const removeSeat = useCallback((seatId: string) => {
    setError(null)
    
    setCart(prevCart => {
      if (!prevCart) return null

      const newSeats = prevCart.seats.filter(seat => seat.seatId !== seatId)
      
      if (newSeats.length === 0) {
        return null
      }

      return {
        ...prevCart,
        seats: newSeats,
        totalAmount: newSeats.reduce((total, seat) => total + seat.price, 0)
      }
    })
  }, [])

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart(null)
    setError(null)
  }, [])

  // Check if seat is in cart
  const isSeatInCart = useCallback((seatId: string): boolean => {
    return cart?.seats.some(seat => seat.seatId === seatId) ?? false
  }, [cart])

  // Get cart summary
  const getCartSummary = useCallback(() => {
    if (!cart) {
      return {
        totalSeats: 0,
        totalAmount: 0,
        canAddMore: true,
        isExpired: true
      }
    }

    const isExpired = new Date(cart.expiresAt) <= new Date()
    const canAddMore = cart.seats.length < TICKET_LIMITS.MAX_TICKETS_PER_USER && !isExpired

    return {
      totalSeats: cart.seats.length,
      totalAmount: cart.totalAmount,
      canAddMore,
      isExpired
    }
  }, [cart])

  // Validate ticket limit before adding
  const validateTicketLimit = useCallback((additionalTickets: number = 1): boolean => {
    const currentCount = cart?.seats.length ?? 0
    return (currentCount + additionalTickets) <= TICKET_LIMITS.MAX_TICKETS_PER_USER
  }, [cart])

  return {
    cart,
    isLoading,
    error,
    addSeat,
    removeSeat,
    clearCart,
    isSeatInCart,
    getCartSummary,
    validateTicketLimit,
    setIsLoading,
    setError
  }
}