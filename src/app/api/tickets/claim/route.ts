import { NextRequest, NextResponse } from 'next/server'

import { GET as getTicketsByCheckout } from '../by-cart/route'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const checkoutSessionId = typeof body?.checkout_session_id === 'string'
      ? body.checkout_session_id
      : null

    if (!checkoutSessionId) {
      return NextResponse.json(
        { error: 'checkout_session_id is required' },
        { status: 400 },
      )
    }

    const url = new URL(request.url)
    url.pathname = '/api/tickets/by-cart'
    url.searchParams.set('checkout_session_id', checkoutSessionId)

    const proxiedRequest = new NextRequest(url.toString(), {
      method: 'GET',
      headers: request.headers,
    })

    return getTicketsByCheckout(proxiedRequest)
  } catch {
    return NextResponse.json(
      { error: 'Invalid request payload' },
      { status: 400 },
    )
  }
}
