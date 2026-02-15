export type AccountEvent = {
  id: string
  movieTitle: string
  sessionTime: string
  cinemaName: string
  seatLabels: string[]
  status: string
  amount: number
  type?: 'STANDARD' | 'VIP'
  cinemaAddress?: string
  barcode?: string
}

export type AccountPending = {
  orderId: string
  cartId: string | null
  sessionId: string | null
  totalAmount: number
  status: string
  createdAt: string
  updatedAt: string | null
  sessionTime: string | null
  movieTitle: string
  cinemaName: string
  cinemaAddress?: string | null
  checkoutSessionId: string | null
  paymentIntentStatus: string | null
  paymentReference: string | null
}

export type UserProfile = {
  firstName: string
  lastName: string
  email: string
}
