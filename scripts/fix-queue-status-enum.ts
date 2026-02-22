/**
 * One-time fix: add 'READY' to queue_status enum if missing.
 * Run: npx tsx scripts/fix-queue-status-enum.ts
 * Then run: npm run db:push
 */

import { sql } from 'drizzle-orm'
import { db } from '../src/db'

async function main() {
  try {
    await db.execute(sql.raw("ALTER TYPE queue_status ADD VALUE 'READY'"))
    console.log("[ok] Added 'READY' to queue_status. You can run npm run db:push now.")
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('already exists')) {
      console.log("[ok] 'READY' already in queue_status. Run npm run db:push.")
      return
    }
    console.error(e)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
