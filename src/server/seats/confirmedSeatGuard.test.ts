import { describe, expect, it } from 'vitest'
import { enforceConfirmedSeatsAsSold } from './confirmedSeatGuard'

type SeatMock = {
  id: string
  seatId: string
  status: 'AVAILABLE' | 'HELD' | 'SOLD'
}

describe('enforceConfirmedSeatsAsSold', () => {
  it('marks confirmed seats as SOLD in get-all response', () => {
    const seats: SeatMock[] = [
      { id: 's1', seatId: 'A1', status: 'AVAILABLE' },
      { id: 's2', seatId: 'A2', status: 'HELD' },
      { id: 's3', seatId: 'A3', status: 'AVAILABLE' },
    ]

    const result = enforceConfirmedSeatsAsSold(seats, ['s3'])

    expect(result.find((s) => s.id === 's3')?.status).toBe('SOLD')
    expect(result.find((s) => s.id === 's1')?.status).toBe('AVAILABLE')
    expect(result.find((s) => s.id === 's2')?.status).toBe('HELD')
  })

  it('ignores null/undefined ids and keeps existing SOLD seats', () => {
    const seats: SeatMock[] = [
      { id: 's1', seatId: 'B1', status: 'SOLD' },
      { id: 's2', seatId: 'B2', status: 'AVAILABLE' },
    ]

    const result = enforceConfirmedSeatsAsSold(seats, [null, undefined, 's2'])

    expect(result.find((s) => s.id === 's1')?.status).toBe('SOLD')
    expect(result.find((s) => s.id === 's2')?.status).toBe('SOLD')
  })
})
