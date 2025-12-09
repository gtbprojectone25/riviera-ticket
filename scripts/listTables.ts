import { db } from '@/db'
import { sql } from 'drizzle-orm'

async function main() {
  const res: any = await db.execute(
    sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
  )
  console.log(res.rows)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
