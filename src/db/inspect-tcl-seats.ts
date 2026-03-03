import { db } from '@/db'
import { seats, sessions, cinemas, tickets } from '@/db/schema'
import { eq, and, like, or } from 'drizzle-orm'

async function inspectSeats() {
  console.log('Inspecionando assentos específicos (H-19, H-20, J-17, J-18) para TCL...')

  // 1. Find TCL Cinema ID
  const tclCinema = await db.query.cinemas.findFirst({
    where: like(cinemas.name, '%Chinese%')
  })

  if (!tclCinema) {
    console.log('Cinema TCL não encontrado.')
    return
  }
  console.log(`Cinema encontrado: ${tclCinema.name} (${tclCinema.id})`)

  // 2. Find sessions for this cinema
  const tclSessions = await db.query.sessions.findMany({
    where: eq(sessions.cinemaId, tclCinema.id)
  })
  
  if (tclSessions.length === 0) {
    console.log('Nenhuma sessão encontrada para TCL.')
    return
  }
  console.log(`Encontradas ${tclSessions.length} sessões. Verificando assentos...`)

  for (const session of tclSessions) {
    console.log(`\nSessão: ${session.id} (${session.movieTitle}) - Start: ${session.startTime}`)
    
    // Check specific seats
    const targetSeats = await db
      .select()
      .from(seats)
      .where(
        and(
          eq(seats.sessionId, session.id),
          or(
            eq(seats.seatId, 'H-19'),
            eq(seats.seatId, 'H-20'),
            eq(seats.seatId, 'J-17'),
            eq(seats.seatId, 'J-18')
          )
        )
      )

    if (targetSeats.length === 0) {
      console.log('  Nenhum desses assentos encontrado nesta sessão.')
      continue
    }

    for (const seat of targetSeats) {
      console.log(`  Seat ${seat.seatId}: Status=${seat.status}, SoldCartId=${seat.soldCartId}, SoldAt=${seat.soldAt}`)
      
      // Check for tickets for this seat
      const seatTickets = await db
        .select()
        .from(tickets)
        .where(
            and(
                eq(tickets.sessionId, session.id),
                eq(tickets.seatId, seat.id)
            )
        )
      
      if (seatTickets.length > 0) {
          console.log(`    -> Tem ${seatTickets.length} Tickets:`)
          seatTickets.forEach(t => console.log(`       TicketID=${t.id}, Status=${t.status}, OrderID=${t.orderId}`))
      } else {
          console.log(`    -> Sem Tickets associados.`)
      }
    }
  }
  process.exit(0)
}

inspectSeats().catch(console.error)
