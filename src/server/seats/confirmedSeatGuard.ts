type SeatLike = {
  id: string
  status: string
}

export function enforceConfirmedSeatsAsSold<T extends SeatLike>(
  allSeats: T[],
  confirmedSeatIds: Iterable<string | null | undefined>,
): T[] {
  const confirmed = new Set(
    Array.from(confirmedSeatIds).filter((id): id is string => Boolean(id)),
  )

  return allSeats.map((seat) =>
    confirmed.has(seat.id)
      ? { ...seat, status: 'SOLD' as T['status'] }
      : seat,
  )
}
