import { db } from '@/db'
import { sql } from 'drizzle-orm'

async function main() {
  const enumNames = ['ticket_status', 'ticket_type', 'seat_type']
  for (const name of enumNames) {
    const res: any = await db.execute(
      sql`select enumlabel from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname = ${name}`,
    )
    console.log(name, res.rows.map((r: any) => r.enumlabel))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
