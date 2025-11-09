/**
 * Configuração do banco de dados para a aplicação Riviera Ticket
 * 
 * Este arquivo contém utilitários para configurar e popular o banco de dados
 * com dados iniciais necessários para o funcionamento da aplicação.
 */

import { db } from '@/db'
import { 
  users, 
  sessions, 
  seats, 
  carts,
  paymentIntents
} from '@/db/schema'

// Dados de exemplo para popular o banco
export const sampleSessions = [
  {
    movieTitle: 'DUNE 2',
    movieDuration: 165, // duração em minutos
    startTime: new Date('2024-01-20T14:00:00'),
    endTime: new Date('2024-01-20T16:45:00'),
    cinemaName: 'Riviera Shopping',
    screenType: 'IMAX_70MM' as const,
    totalSeats: 200,
    availableSeats: 150,
    basePrice: 2999, // R$ 29.99 em centavos
    vipPrice: 4999 // R$ 49.99 em centavos
  },
  {
    movieTitle: 'DUNE 2',
    movieDuration: 165,
    startTime: new Date('2024-01-20T17:30:00'),
    endTime: new Date('2024-01-20T20:15:00'),
    cinemaName: 'Riviera Shopping',
    screenType: 'IMAX_70MM' as const,
    totalSeats: 200,
    availableSeats: 180,
    basePrice: 2999,
    vipPrice: 4999
  },
  {
    movieTitle: 'DUNE 2',
    movieDuration: 165,
    startTime: new Date('2024-01-20T21:00:00'),
    endTime: new Date('2024-01-20T23:45:00'),
    cinemaName: 'Riviera Shopping',
    screenType: 'IMAX_70MM' as const,
    totalSeats: 200,
    availableSeats: 195,
    basePrice: 3499, // R$ 34.99 em centavos
    vipPrice: 5499 // R$ 54.99 em centavos
  }
]

// Função para gerar assentos para uma sessão
export function generateSeatsForSession(sessionId: string) {
  const seats = []
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  const seatsPerRow = 16

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    
    for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber++) {
      // Definir tipo de assento baseado na posição
      let seatType: 'STANDARD' | 'VIP' | 'PREMIUM' = 'STANDARD'
      let price = 2999 // Preço padrão
      
      // Fileiras E, F, G são VIP (meio da sala)
      if (['E', 'F', 'G'].includes(row)) {
        seatType = 'VIP'
        price = 4999 // R$ 49.99
      }
      
      // Últimas 2 fileiras são Premium
      if (['K', 'L'].includes(row)) {
        seatType = 'PREMIUM'
        price = 3999 // R$ 39.99
      }

      seats.push({
        id: crypto.randomUUID(),
        sessionId,
        row,
        number: seatNumber,
        seatId: `${row}${seatNumber.toString().padStart(2, '0')}`,
        type: seatType,
        price,
        isAvailable: true,
        isReserved: false,
        reservedBy: null,
        reservedUntil: null
      })
    }
  }

  return seats
}

// Função para popular o banco com dados de exemplo
export async function seedDatabase() {
  try {
    console.log('🌱 Iniciando população do banco de dados...')

    // Limpar dados existentes (cuidado em produção!)
    await db.delete(seats)
    await db.delete(sessions)
    console.log('✅ Dados existentes removidos')

    // Inserir sessões de exemplo
    const insertedSessions = await db.insert(sessions).values(sampleSessions).returning()
    console.log(`✅ ${insertedSessions.length} sessões inseridas`)

    // Inserir assentos para cada sessão
    for (const session of insertedSessions) {
      const sessionSeats = generateSeatsForSession(session.id)
      await db.insert(seats).values(sessionSeats)
      console.log(`✅ ${sessionSeats.length} assentos inseridos para sessão ${session.startTime.toLocaleTimeString()}`)
    }

    console.log('🎉 Banco de dados populado com sucesso!')
    
    return {
      success: true,
      message: 'Banco de dados configurado com sucesso',
      data: {
        sessions: insertedSessions.length,
        totalSeats: insertedSessions.length * 192 // 12 fileiras x 16 assentos
      }
    }

  } catch (error) {
    console.error('❌ Erro ao popular banco de dados:', error)
    return {
      success: false,
      message: 'Erro ao configurar banco de dados',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// Função para verificar conexão com o banco
export async function checkDatabaseConnection() {
  try {
    // Tentar fazer uma query simples
    const result = await db.select().from(sessions).limit(1)
    
    return {
      success: true,
      message: 'Conexão com banco de dados estabelecida',
      hasData: result.length > 0
    }

  } catch (error) {
    console.error('❌ Erro na conexão com banco:', error)
    return {
      success: false,
      message: 'Falha na conexão com banco de dados',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// Função para limpar reservas expiradas (executar periodicamente)
export async function cleanupExpiredReservations() {
  try {
    const now = new Date()
    
    // Buscar assentos com reservas expiradas - implementar lógica específica depois
    const expiredSeats: Array<{ id: string }> = [] // Placeholder por enquanto

    // Atualizar assentos expirados
    if (expiredSeats.length > 0) {
      await db
        .update(seats)
        .set({
          isReserved: false,
          reservedBy: null,
          reservedUntil: null,
          updatedAt: now
        })
        // WHERE clause seria necessário aqui com IDs dos assentos
    }

    console.log(`🧹 ${expiredSeats.length} reservas expiradas limpas`)

    return {
      success: true,
      cleanedReservations: expiredSeats.length
    }

  } catch (error) {
    console.error('❌ Erro ao limpar reservas:', error)
    return {
      success: false,
      message: 'Erro ao limpar reservas expiradas'
    }
  }
}

// Função para estatísticas do sistema
export async function getDatabaseStats() {
  try {
    const [
      totalSessions,
      totalSeats, 
      totalUsers,
      totalCarts,
      totalPayments
    ] = await Promise.all([
      db.select().from(sessions),
      db.select().from(seats),
      db.select().from(users),
      db.select().from(carts),
      db.select().from(paymentIntents)
    ])

    return {
      success: true,
      stats: {
        sessions: totalSessions.length,
        seats: totalSeats.length,
        users: totalUsers.length,
        carts: totalCarts.length,
        payments: totalPayments.length,
        availableSeats: totalSeats.filter(seat => seat.isAvailable && !seat.isReserved).length,
        reservedSeats: totalSeats.filter(seat => seat.isReserved).length
      }
    }

  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error)
    return {
      success: false,
      message: 'Erro ao buscar estatísticas do banco'
    }
  }
}