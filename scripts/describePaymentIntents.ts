import { db } from '@/db'
import { sql } from 'drizzle-orm'

async function main() {
  const res: any = await db.execute(
    sql`select column_name, data_type, is_nullable from information_schema.columns where table_name='payment_intents' order by ordinal_position`,
  )
  console.log(res.rows)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
