import { db } from '@/db'
import { seats, sessions, cinemas } from '@/db/schema'
import { eq, and, like, ne, inArray } from 'drizzle-orm'

async function syncSoldSeats() {
  console.log('Sincronizando assentos vendidos entre todas as sessões do TCL...')

  // 1. Find TCL Cinema
  const tclCinema = await db.query.cinemas.findFirst({
    where: like(cinemas.name, '%Chinese%')
  })

  if (!tclCinema) {
    console.log('Cinema TCL não encontrado.')
    return
  }
  console.log(`Cinema: ${tclCinema.name} (${tclCinema.id})`)

  // 2. Get all sessions for this cinema
  const tclSessions = await db.query.sessions.findMany({
    where: eq(sessions.cinemaId, tclCinema.id)
  })

  if (tclSessions.length === 0) {
    console.log('Nenhuma sessão encontrada.')
    return
  }
  const sessionIds = tclSessions.map(s => s.id)
  console.log(`Encontradas ${sessionIds.length} sessões.`)

  // 3. Find ALL sold seats across these sessions
  // We identify seats by their "seatId" (e.g. "H-19") which is consistent across sessions
  const allSoldSeats = await db
    .select({
      seatLabel: seats.seatId,
    })
    .from(seats)
    .where(
      and(
        inArray(seats.sessionId, sessionIds),
        eq(seats.status, 'SOLD')
      )
    )

  // Get unique seat labels that are sold anywhere
  const soldSeatLabels = [...new Set(allSoldSeats.map(s => s.seatLabel))]
  
  if (soldSeatLabels.length === 0) {
    console.log('Nenhum assento vendido encontrado em nenhuma sessão.')
    return
  }

  console.log(`Assentos vendidos encontrados (globalmente no cinema): ${soldSeatLabels.join(', ')}`)

  // 4. Update ALL sessions to mark these seats as SOLD
  // We update only if they are not already SOLD
  const result = await db
    .update(seats)
    .set({
      status: 'SOLD',
      soldAt: new Date(), // Mark as sold now
      // We can't easily link to the original cart/ticket here without more complex logic, 
      // but status=SOLD is enough to block them.
    })
    .where(
      and(
        inArray(seats.sessionId, sessionIds),
        inArray(seats.seatId, soldSeatLabels),
        ne(seats.status, 'SOLD')
      )
    )
    .returning({ id: seats.id, seatId: seats.seatId, sessionId: seats.sessionId })

  if (result.length > 0) {
    console.log(`\nSincronização concluída! ${result.length} assentos foram atualizados para SOLD.`)
    // Optional: Log details
    // result.forEach(r => console.log(`  - ${r.seatId} na sessão ${r.sessionId}`))
  } else {
    console.log('\nTodos os assentos já estavam sincronizados. Nenhuma alteração necessária.')
  }

  process.exit(0)
}

syncSoldSeats().catch(console.error)
