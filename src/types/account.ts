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
  id: string
  sessionId: string
  totalAmount: number
  status: string
  createdAt: string
  expiresAt: string
  sessionTime: string
  movieTitle: string
  cinemaName: string
  cinemaAddress?: string
}

export type UserProfile = {
  firstName: string
  lastName: string
  email: string
}
