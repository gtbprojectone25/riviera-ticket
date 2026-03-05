import { syncSoldSeatsWithConfirmedTickets } from '@/lib/sync-sold-seats'

async function run() {
  console.log('[sync-sold-seats] starting global reconciliation...')
  const result = await syncSoldSeatsWithConfirmedTickets()
  console.log(`[sync-sold-seats] done. updated=${result.updated}`)
  process.exit(0)
}

run().catch((error) => {
  console.error('[sync-sold-seats] failed', error)
  process.exit(1)
})

