import { NextRequest, NextResponse } from 'next/server'

import { GET as getTicketsByCheckout } from '../by-cart/route'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const checkoutSessionId = typeof body?.checkout_session_id === 'string'
      ? body.checkout_session_id
      : null
    const cartId = typeof body?.cartId === 'string' ? body.cartId : null

    if (!checkoutSessionId && !cartId) {
      return NextResponse.json(
        { error: 'checkout_session_id or cartId is required' },
        { status: 400 },
      )
    }

    const url = new URL(request.url)
    url.pathname = '/api/tickets/by-cart'
    if (checkoutSessionId) {
      url.searchParams.set('checkout_session_id', checkoutSessionId)
    }
    if (cartId) {
      url.searchParams.set('cartId', cartId)
    }

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
