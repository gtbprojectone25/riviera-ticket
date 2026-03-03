import { db } from '@/db'
import { seats, sessions, cinemas, tickets } from '@/db/schema'
import { eq, and, isNotNull, or, ne, sql } from 'drizzle-orm'

async function checkInconsistentSeats() {
  console.log('Verificando assentos com inconsistências de status (Cruzando com Tickets)...')

  // 1. Check for Tickets that are NOT SOLD but should be
  const seatsWithTicketsNotSold = await db
    .select({
      id: seats.id,
      seatId: seats.seatId,
      status: seats.status,
      sessionId: seats.sessionId,
      cinemaName: cinemas.name,
      ticketStatus: tickets.status,
    })
    .from(tickets)
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .leftJoin(sessions, eq(seats.sessionId, sessions.id))
    .leftJoin(cinemas, eq(sessions.cinemaId, cinemas.id))
    .where(
      and(
        ne(tickets.status, 'CANCELLED'),
        ne(seats.status, 'SOLD')
      )
    )

  if (seatsWithTicketsNotSold.length > 0) {
    console.log(`\nALERTA: Encontrados ${seatsWithTicketsNotSold.length} assentos com TICKETS válidos mas status não é SOLD.`)
    seatsWithTicketsNotSold.forEach(s => {
      console.log(`  - ${s.seatId} (Session: ${s.sessionId}, Cinema: ${s.cinemaName}) -> SeatStatus: ${s.status}, TicketStatus: ${s.ticketStatus}`)
    })
    
    console.log('Aplicando correção: atualizando status para SOLD...')
    for (const seat of seatsWithTicketsNotSold) {
       await db.update(seats)
         .set({ status: 'SOLD', soldAt: new Date() })
         .where(eq(seats.id, seat.id))
    }
    console.log('Correção aplicada.')
  } else {
    console.log('Nenhum assento inconsistente com Tickets encontrado.')
  }

  // 2. Check for seats with soldCartId/soldAt but not SOLD (orphan metadata)
  console.log('\nVerificando metadados de venda (soldCartId/soldAt)...')
  const inconsistentMetadata = await db
    .select({
      id: seats.id,
      seatId: seats.seatId,
      status: seats.status,
      soldCartId: seats.soldCartId,
      soldAt: seats.soldAt,
      sessionId: seats.sessionId,
      cinemaName: cinemas.name,
    })
    .from(seats)
    .leftJoin(sessions, eq(seats.sessionId, sessions.id))
    .leftJoin(cinemas, eq(sessions.cinemaId, cinemas.id))
    .where(
      and(
        or(
          isNotNull(seats.soldCartId),
          isNotNull(seats.soldAt)
        ),
        ne(seats.status, 'SOLD')
      )
    )

  if (inconsistentMetadata.length > 0) {
    console.log(`\nALERTA: Encontrados ${inconsistentMetadata.length} assentos com metadados de venda mas status não é SOLD.`)
    inconsistentMetadata.forEach(s => {
      console.log(`  - ${s.seatId} (Session: ${s.sessionId}, Cinema: ${s.cinemaName}) -> Status: ${s.status}, SoldCartId: ${s.soldCartId}, SoldAt: ${s.soldAt}`)
    })

    console.log('Aplicando correção: atualizando status para SOLD...')
    for (const seat of inconsistentMetadata) {
       await db.update(seats)
         .set({ status: 'SOLD' })
         .where(eq(seats.id, seat.id))
    }
    console.log('Correção aplicada.')
  } else {
    console.log('Nenhum assento com metadados inconsistentes encontrado.')
  }

  console.log('\nVerificação concluída.')
  process.exit(0)
}

checkInconsistentSeats().catch(console.error)
