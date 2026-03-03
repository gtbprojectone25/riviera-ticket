import { describe, expect, it } from 'vitest'
import type { Seat } from '@/db/schema'
import { toSeatStateDTO } from './seatStateDTO'

function makeSeat(overrides: Partial<Seat> = {}): Seat {
  const now = new Date('2026-01-01T00:00:00.000Z')
  return {
    id: 'seat-1',
    sessionId: 'session-1',
    row: 'A',
    number: 1,
    seatId: 'A1',
    status: 'AVAILABLE',
    heldUntil: null,
    heldBy: null,
    heldByCartId: null,
    soldAt: null,
    soldCartId: null,
    isAvailable: true,
    isReserved: false,
    reservedBy: null,
    reservedUntil: null,
    type: 'STANDARD',
    price: 1000,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('toSeatStateDTO', () => {
  it('marks SOLD when seat.status is SOLD', () => {
    const dto = toSeatStateDTO(makeSeat({ status: 'SOLD' }))
    expect(dto.status).toBe('SOLD')
  })

  it('marks SOLD when soldAt exists even if status is AVAILABLE', () => {
    const dto = toSeatStateDTO(makeSeat({ status: 'AVAILABLE', soldAt: new Date('2026-01-01T00:00:00.000Z') }))
    expect(dto.status).toBe('SOLD')
    expect(dto.soldAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('marks HELD when held is active and not sold', () => {
    const dto = toSeatStateDTO(
      makeSeat({
        status: 'HELD',
        heldByCartId: 'cart-1',
        heldUntil: new Date('2026-01-01T00:10:00.000Z'),
      }),
      new Date('2026-01-01T00:00:00.000Z'),
    )
    expect(dto.status).toBe('HELD')
    expect(dto.heldByCartId).toBe('cart-1')
    expect(dto.heldUntil).toBe('2026-01-01T00:10:00.000Z')
  })

  it('marks AVAILABLE when heldUntil is in the past', () => {
    const dto = toSeatStateDTO(
      makeSeat({
        status: 'HELD',
        heldByCartId: 'cart-1',
        heldUntil: new Date('2026-01-01T00:00:00.000Z'),
      }),
      new Date('2026-01-01T00:00:01.000Z'),
    )
    expect(dto.status).toBe('AVAILABLE')
    expect(dto.heldByCartId).toBe(null)
    expect(dto.heldUntil).toBe(null)
  })

  it('marks SOLD if soldCartId is present even if status is AVAILABLE', () => {
    const dto = toSeatStateDTO(
      makeSeat({
        status: 'AVAILABLE',
        soldCartId: 'cart-123',
      }),
      new Date('2026-01-01T00:00:00.000Z'),
    )
    expect(dto.status).toBe('SOLD')
  })
})

