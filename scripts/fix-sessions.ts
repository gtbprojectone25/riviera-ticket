/**
 * Script para limpar sessões antigas e criar novas para amanhã
 */

import { db } from '../src/db'
import { sessions, cinemas, auditoriums, type AuditoriumLayout } from '../src/db/schema'
import { lt, eq } from 'drizzle-orm'

async function main() {
  const now = new Date()
  console.log('Agora:', now.toISOString())

  // Listar sessões
  const allSessions = await db.select().from(sessions)
  console.log('Total de sessões:', allSessions.length)
  
  allSessions.forEach(s => {
    const isFuture = s.startTime > now
    console.log(`- ${s.cinemaId || s.cinemaName} | ${s.startTime.toISOString()} | Futuro: ${isFuture}`)
  })
  
  const remaining = allSessions.filter(s => s.startTime > now)
  
  if (remaining.length === 0) {
    console.log('Nenhuma sessão disponível. Criando novas sessões...')
    
    // Verificar se há cinemas cadastrados
    const allCinemas = await db.select().from(cinemas)
    console.log('Cinemas no banco:', allCinemas.length)
    
    if (allCinemas.length > 0) {
      // Criar sessão para o primeiro cinema
      const cinema = allCinemas[0]
      
      // Verificar/criar auditorium
      let [aud] = await db.select().from(auditoriums).where(eq(auditoriums.cinemaId, cinema.id)).limit(1)
      
      if (!aud) {
        const layout: AuditoriumLayout = {
          rowsConfig: [
            { row: 'A', seatCount: 14 },
            { row: 'B', seatCount: 18 },
            { row: 'C', seatCount: 22 },
            { row: 'D', seatCount: 26 },
            { row: 'E', seatCount: 30 },
            { row: 'F', seatCount: 34 },
            { row: 'G', seatCount: 34 },
            { row: 'H', seatCount: 32 },
            { row: 'J', seatCount: 30 },
            { row: 'K', seatCount: 26 },
          ],
          vipZones: [{ rows: ['F', 'G', 'H'], fromPercent: 0.3, toPercent: 0.7 }],
        }
        const totalSeats = layout.rowsConfig.reduce((acc, r) => acc + r.seatCount, 0)
        
        ;[aud] = await db.insert(auditoriums).values({
          cinemaId: cinema.id,
          name: `${cinema.name} IMAX`,
          format: 'IMAX 70MM',
          layout,
          totalSeats,
          approxCapacity: totalSeats,
        }).returning()
        
        console.log('Auditorium criado:', aud.name)
      }
      
      // Criar sessão para amanhã às 19h
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(19, 0, 0, 0)
      
      const endTime = new Date(tomorrow.getTime() + 150 * 60 * 1000)
      
      const [newSession] = await db.insert(sessions).values({
        movieTitle: 'The Odyssey',
        movieDuration: 150,
        startTime: tomorrow,
        endTime: endTime,
        cinemaName: cinema.name,
        cinemaId: cinema.id,
        auditoriumId: aud.id,
        screenType: 'IMAX_70MM',
        totalSeats: aud.totalSeats || 266,
        availableSeats: aud.totalSeats || 266,
        basePrice: 34900,
        vipPrice: 44900,
      }).returning()
      
      console.log('Nova sessão criada:', newSession.id)
      console.log('  - Cinema:', newSession.cinemaName)
      console.log('  - Data:', newSession.startTime.toISOString())
    }
  }
  
  process.exit(0)
}

main().catch(console.error)
