/**
 * TypeScript definitions for the Riviera Ticket application
 */

export interface User {
  id: string
  email: string
  name: string
  surname: string
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  movieTitle: string
  movieDuration: number
  startTime: Date
  endTime: Date
  cinemaName: string
  screenType: 'IMAX_70MM' | 'STANDARD'
  totalSeats: number
  availableSeats: number
  price: number
  createdAt: Date
  updatedAt: Date
}

export interface Seat {
  id: string // public seat identifier (e.g. A-01)
  sessionId: string
  row: string
  number: number
  seatId: string // legacy alias
  status: 'AVAILABLE' | 'HELD' | 'SOLD'
  heldUntil?: string | null
  heldByCartId?: string | null
  soldAt?: string | null
  soldCartId?: string | null
  price: number
  type: 'STANDARD' | 'VIP' | 'PREMIUM' | 'WHEELCHAIR'
}

export interface Ticket {
  id: string
  sessionId: string
  userId: string
  seatId: string
  ticketType: 'STANDARD' | 'VIP'
  price: number
  purchaseDate: Date
  status: 'RESERVED' | 'CONFIRMED' | 'CANCELLED'
  qrCode?: string
  expiresAt: Date
}

export interface Cart {
  id: string
  userId?: string
  sessionId: string
  seats: CartSeat[]
  totalAmount: number
  createdAt: Date
  expiresAt: Date
  status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED'
}

export interface CartSeat {
  seatId: string
  row: string
  number: number
  type: 'STANDARD' | 'VIP'
  price: number
}

export interface PaymentIntent {
  id: string
  cartId: string
  stripePaymentIntentId: string
  amountCents: number
  currency: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
  createdAt: Date
  updatedAt: Date
}

export interface MovieInfo {
  title: string
  subtitle: string
  releaseDate: string
  duration: number
  genre: string[]
  director: string
  cast: string[]
  synopsis: string
  posterUrl: string
  trailerUrl?: string
  imaxInfo: {
    format: '70MM'
    experience: string
    benefits: string[]
  }
}

// Form validation types
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  name: string
  surname: string
}

export interface TicketSelectionFormData {
  sessionId: string
  selectedSeats: string[]
}

export interface CheckoutFormData {
  paymentMethodId: string
  billingAddress: {
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface SessionAvailability {
  sessionId: string
  availableSeats: Seat[]
  unavailableSeats: string[]
  totalSeats: number
}

// Constants
export const TICKET_LIMITS = {
  MAX_TICKETS_PER_USER: 4,
  RESERVATION_TIMEOUT_MINUTES: 10,
} as const

export const SEAT_TYPES = {
  STANDARD: 'STANDARD',
  VIP: 'VIP',
  PREMIUM: 'PREMIUM',
} as const

export const TICKET_STATUS = {
  RESERVED: 'RESERVED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const
