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

export type UserProfile = {
  firstName: string
  lastName: string
  ssn: string
  email: string
}
