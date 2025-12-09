/**
 * Seed de um cliente com pagamento concluído e ticket gerado.
 * Usa os schemas atuais do banco (sem tabela orders).
 *
 * Rodar com:
 *   npm run db:seed:sample-ticket
 */

import { db } from '@/db'
import argon2 from 'argon2'
import { sql } from 'drizzle-orm'

const TEST_EMAIL = 'seed.customer@example.com'
const TEST_PASSWORD = 'Password123!'

async function ensureUser() {
  const existingRes: any = await db.execute(
    sql`select * from "users" where "email" = ${TEST_EMAIL} limit 1`,
  )
  const existing = existingRes.rows?.[0]
  if (existing) return existing

  const hashedPassword = await argon2.hash(TEST_PASSWORD)
  const insertRes: any = await db.execute(sql`
    insert into "users" ("email","name","surname","hashed_password","email_verified")
    values (${TEST_EMAIL}, 'Seed', 'Customer', ${hashedPassword}, true)
    returning *
  `)
  const created = insertRes.rows?.[0]

  // userProfiles foi removido do schema - não criar profile separado

  return created
}

async function pickSeat() {
  const availableRes: any = await db.execute(
    sql`select * from "seats" where "is_available" = true limit 1`,
  )
  const available = availableRes.rows?.[0]
  if (available) return available

  const anyRes: any = await db.execute(sql`select * from "seats" limit 1`)
  const anySeat = anyRes.rows?.[0]
  if (!anySeat) {
    throw new Error('Nenhum assento encontrado. Rode antes: npm run db:seed:odyssey-sessions')
  }
  return anySeat
}

async function seedSamplePaidTicket() {
  console.log('>> Seed: criando ticket pago de exemplo')

  const user = await ensureUser()
  const seat = await pickSeat()

  const sessionRes: any = await db.execute(
    sql`select * from "sessions" where "id" = ${seat.session_id} limit 1`,
  )
  const session = sessionRes.rows?.[0]
  if (!session) throw new Error('Sessão do assento não encontrada.')

  const amount = seat.price ?? session.base_price ?? 34900

  const ticketRes: any = await db.execute(sql`
    insert into "tickets" (
      "session_id","user_id","seat_id","ticket_type","price","status","purchase_date"
    )
    values (
      ${session.id},
      ${user.id},
      ${seat.id},
      'STANDARD',
      ${amount},
      'CONFIRMED',
      now()
    )
    returning *
  `)
  const ticket = ticketRes.rows?.[0]

  await db.execute(sql`
    update "seats"
    set "is_available" = false,
        "is_reserved" = false,
        "reserved_by" = ${user.id},
        "reserved_until" = null
    where "id" = ${seat.id}
  `)

  console.log('Seed concluído:')
  console.log({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    ticketId: ticket?.id,
    seat: seat.seat_id ?? `${seat.row}${seat.number}`,
    sessionId: session.id,
  })
}

if (require.main === module) {
  seedSamplePaidTicket()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}

export { seedSamplePaidTicket }
