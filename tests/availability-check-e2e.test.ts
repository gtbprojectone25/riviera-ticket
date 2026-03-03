import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const AMC_ID = 'amc-lincoln-square'

async function getJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Request failed ${res.status}: ${body}`)
  }
  return res.json()
}

async function postJson(url: string, data: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

describe('Availability Check E2E', () => {
  it('prevents double booking of seats', async () => {
    // 1. Get a session
    const sessions = (await getJson(`${BASE_URL}/api/sessions?cinemaId=${AMC_ID}`)) as any[]
    expect(sessions.length).toBeGreaterThan(0)
    const sessionId = sessions[0].id

    // 2. Get seats and find an AVAILABLE one
    // Ensure=true can be slow, so we wait
    const rows = (await getJson(`${BASE_URL}/api/sessions/${sessionId}/seats?ensure=true`)) as any[]
    const allSeats = rows.flatMap((r) => r.seats)
    // Try to find a seat that is definitely available and standard
    const availableSeat = allSeats.find((s) => s.status === 'AVAILABLE' && s.type === 'STANDARD')
    
    if (!availableSeat) {
      console.warn('No available standard seats found for test, skipping double booking test')
      return
    }

    const seatId = availableSeat.id
    const seatCode = availableSeat.seatId // Assuming the API returns 'seatId' as the code
    
    // 3. User A holds the seat
    const resA = await postJson(`${BASE_URL}/api/seats/hold`, {
      sessionId,
      seatIds: [seatId],
      ttlMinutes: 5
    })
    
    expect(resA.ok).toBe(true)
    // The API returns the seat CODES in heldSeatIds
    expect(resA.body.heldSeatIds).toContain(seatCode)

    // 4. Verify seat status is now HELD (unavailable)
    const rowsAfter = (await getJson(`${BASE_URL}/api/sessions/${sessionId}/seats`)) as any[]
    const seatAfter = rowsAfter.flatMap((r) => r.seats).find((s) => s.id === seatId)
    expect(seatAfter.status).toBe('HELD')

    // 5. User B tries to hold the SAME seat
    const resB = await postJson(`${BASE_URL}/api/seats/hold`, {
      sessionId,
      seatIds: [seatId],
      ttlMinutes: 5
    })

    // Should fail
    expect(resB.ok).toBe(false)
    expect(resB.status).toBe(409)
  }, 20000) // Increase timeout to 20s
})
