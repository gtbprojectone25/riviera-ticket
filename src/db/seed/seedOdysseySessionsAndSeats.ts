/**
 * Seed de sessões de "The Odyssey" e assentos para todos os auditoriums.
 *
 * Usa o layout salvo em `auditoriums.layout` e a função
 * `ensureSeatsForSession` para popular a tabela `seats`.
 */

import { db } from '@/db'
import { auditoriums, cinemas, sessions, seats } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { ensureSeatsForSession } from '@/server/seats/generateSeatsForSession'

const MOVIE_TITLE = 'The Odyssey'
const MOVIE_DURATION = 150 // minutos
const BASE_PRICE = 34900
const VIP_PRICE = 44900

export async function seedOdysseySessionsAndSeats() {
  console.log('Seeding The Odyssey sessions and seats for all auditoriums...')

  const cinemaRows = await db.select().from(cinemas)
  const cinemaNameById = new Map<string, string>()
  for (const c of cinemaRows) {
    cinemaNameById.set(c.id, c.name)
  }

  const auditoriumRows = await db.select().from(auditoriums)

  for (const aud of auditoriumRows) {
    const cinemaName = cinemaNameById.get(aud.cinemaId) ?? aud.name

    // Verificar se já existe sessão de The Odyssey para este auditorium
    const existingSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.auditoriumId, aud.id),
          eq(sessions.movieTitle, MOVIE_TITLE),
        ),
      )
      .limit(1)

    if (existingSessions[0]) {
      const existing = existingSessions[0]
      const existingSeats = await db
        .select()
        .from(seats)
        .where(eq(seats.sessionId, existing.id))
        .limit(1)

      if (!existingSeats[0]) {
        const result = await ensureSeatsForSession(existing.id)
        console.log(
          `Created ${result.created} seats for existing session ${existing.id} in auditorium ${aud.name}`,
        )
      } else {
        console.log(
          `Session ${existing.id} in auditorium ${aud.name} already has seats, skipping.`,
        )
      }

      continue
    }

    const start = new Date()
    start.setHours(19, 0, 0, 0)
    const end = new Date(start.getTime() + MOVIE_DURATION * 60 * 1000)

    const totalSeatsFromLayout = aud.totalSeats ?? 0

    const [session] = await db
      .insert(sessions)
      .values({
        movieTitle: MOVIE_TITLE,
        movieDuration: MOVIE_DURATION,
        startTime: start,
        endTime: end,
        cinemaName,
        cinemaId: aud.cinemaId,
        auditoriumId: aud.id,
        screenType: 'IMAX_70MM',
        totalSeats: totalSeatsFromLayout,
        availableSeats: totalSeatsFromLayout,
        basePrice: BASE_PRICE,
        vipPrice: VIP_PRICE,
      })
      .returning()

    const result = await ensureSeatsForSession(session.id)

    console.log(
      `Created session ${session.id} and ${result.created} seats for auditorium ${aud.name}`,
    )
  }

  console.log('The Odyssey sessions and seats seed completed.')
}

// Permite rodar via: npm run db:seed:odyssey-sessions
if (require.main === module) {
  seedOdysseySessionsAndSeats()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
