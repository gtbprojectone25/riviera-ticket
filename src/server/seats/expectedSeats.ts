import type { AuditoriumLayout } from '@/db/schema'

export type ExpectedSeatType = 'STANDARD' | 'VIP' | 'WHEELCHAIR' | 'PREMIUM'

export type ExpectedSeat = {
  row: string
  number: number
  seatId: string
  type: ExpectedSeatType
  price: number
}

function normalizeRow(row: string) {
  return row.trim().toUpperCase()
}

function formatStableSeatId(row: string, number: number) {
  return `${normalizeRow(row)}-${number.toString().padStart(2, '0')}`
}

function getSeatPrice(type: ExpectedSeatType, basePrice: number, vipPrice: number) {
  return type === 'VIP' ? vipPrice : basePrice
}

export function buildExpectedSeatsFromLayout(
  layout: AuditoriumLayout | null,
  basePrice: number,
  vipPrice: number,
): ExpectedSeat[] {
  if (!layout) return []

  const expected: ExpectedSeat[] = []

  if (Array.isArray(layout.rows) && layout.rows.length > 0) {
    for (const rowConfig of layout.rows) {
      const rowLabel = normalizeRow(rowConfig.label)
      for (const seat of rowConfig.seats ?? []) {
        if (!seat || seat.type === 'GAP') continue

        const row = normalizeRow(seat.row || rowLabel)
        const number = Number(seat.number)
        if (!Number.isInteger(number) || number <= 0) continue

        const type = (seat.type ?? 'STANDARD') as ExpectedSeatType
        expected.push({
          row,
          number,
          seatId: formatStableSeatId(row, number),
          type,
          price: getSeatPrice(type, basePrice, vipPrice),
        })
      }
    }

    return expected
  }

  const accessibleMap = new Map<string, Set<number>>()
  for (const acc of layout.accessible ?? []) {
    accessibleMap.set(normalizeRow(acc.row), new Set(acc.seats))
  }

  const vipRangesByRow = new Map<string, Array<{ start: number; end: number }>>()
  for (const zone of layout.vipZones ?? []) {
    for (const zoneRow of zone.rows ?? []) {
      const row = normalizeRow(zoneRow)
      const rowCfg = layout.rowsConfig?.find((r) => normalizeRow(r.row) === row)
      if (!rowCfg) continue

      const seatCount = rowCfg.seatCount
      const start = Math.floor(zone.fromPercent * seatCount) + 1
      const end = Math.ceil(zone.toPercent * seatCount)
      const ranges = vipRangesByRow.get(row) ?? []
      ranges.push({ start, end })
      vipRangesByRow.set(row, ranges)
    }
  }

  for (const rowCfg of layout.rowsConfig ?? []) {
    const row = normalizeRow(rowCfg.row)
    const seatCount = Number(rowCfg.seatCount)
    if (!Number.isInteger(seatCount) || seatCount <= 0) continue

    const accessible = accessibleMap.get(row) ?? new Set<number>()
    const vipRanges = vipRangesByRow.get(row) ?? []

    for (let number = 1; number <= seatCount; number += 1) {
      const isVip = vipRanges.some((range) => number >= range.start && number <= range.end)
      const type: ExpectedSeatType = accessible.has(number)
        ? 'WHEELCHAIR'
        : isVip
          ? 'VIP'
          : 'STANDARD'

      expected.push({
        row,
        number,
        seatId: formatStableSeatId(row, number),
        type,
        price: getSeatPrice(type, basePrice, vipPrice),
      })
    }
  }

  return expected
}
