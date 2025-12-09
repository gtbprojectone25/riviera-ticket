import { NextResponse } from 'next/server'

// Placeholder endpoint to avoid failing My Events tab when backend is not yet wired.
// It returns an empty list when a bearer token is present; otherwise, 401.
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const hasBearer = auth?.toLowerCase().startsWith('bearer ')

  if (!hasBearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: replace with real query to tickets joined with sessions/cinemas.
  return NextResponse.json([])
}
