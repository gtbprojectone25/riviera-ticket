import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const AMC_ID = 'amc-lincoln-square'

type Session = {
  id: string
  startTime: string
  endTime: string
  movieDuration?: number
}

async function getJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Request failed ${res.status}: ${body}`)
  }
  return res.json()
}

describe('sessions + seats (AMC Lincoln)', () => {
  it('lists AMC sessions with valid times', async () => {
    const data = (await getJson(`${BASE_URL}/api/sessions?cinemaId=${AMC_ID}`)) as Session[]
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)

    const s = data[0]
    expect(typeof s.id).toBe('string')
    expect(s.id.length).toBe(36)

    const start = new Date(s.startTime).getTime()
    const end = new Date(s.endTime).getTime()
    expect(Number.isNaN(start)).toBe(false)
    expect(Number.isNaN(end)).toBe(false)
    expect(end).toBeGreaterThan(start)

    if (typeof s.movieDuration === 'number') {
      const minutes = Math.round((end - start) / 60000)
      expect(minutes).toBeCloseTo(s.movieDuration, 1)
    }
  })

  it('returns a seat map for the first AMC session', async () => {
    const sessions = (await getJson(`${BASE_URL}/api/sessions?cinemaId=${AMC_ID}`)) as Session[]
    expect(sessions.length).toBeGreaterThan(0)
    const sessionId: string = sessions[0].id

    const rows = (await getJson(`${BASE_URL}/api/sessions/${sessionId}/seats?ensure=true`)) as Array<{
      label: string
      seats: Array<{ id: string; status: string; type: string }>
    }>

    expect(Array.isArray(rows)).toBe(true)
    expect(rows.length).toBeGreaterThan(0)

    const seats = rows.flatMap((r) => r.seats)
    expect(seats.length).toBeGreaterThan(0)

    const ids = seats.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)

    seats.forEach((seat) => {
      expect(['AVAILABLE', 'HELD', 'SOLD']).toContain(seat.status)
      expect(['STANDARD', 'VIP', 'WHEELCHAIR', 'GAP']).toContain(seat.type)
    })
  })
})
