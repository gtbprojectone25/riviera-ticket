import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/admin-auth'
import { syncSoldSeatsWithConfirmedTickets } from '@/lib/sync-sold-seats'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    const result = await syncSoldSeatsWithConfirmedTickets()
    return NextResponse.json({
      ok: true,
      message: 'Sync completed',
      updated: result.updated,
    })
  } catch (error) {
    console.error('Error syncing sold seats:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to sync sold seats' },
      { status: 500 },
    )
  }
}

