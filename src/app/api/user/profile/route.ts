import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, userSessions } from '@/db/schema'
import { eq } from 'drizzle-orm'

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null
  const cookieToken = request.cookies.get('session')?.value
  const sessionToken = bearerToken || cookieToken

  if (!sessionToken) return null

  const result = await db
    .select({
      user: users,
      session: userSessions,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(eq(userSessions.sessionToken, sessionToken))
    .limit(1)

  if (result.length === 0) return null

  const { user, session } = result[0]
  if (session.expiresAt < new Date()) {
    await db.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken))
    return null
  }

  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      firstName: user.name || '',
      lastName: user.surname || '',
      email: user.email,
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if email is already in use by another user
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 },
      )
    }

    await db
      .update(users)
      .set({
        name: firstName || null,
        surname: lastName || null,
        email,
      })
      .where(eq(users.id, user.id))

    return NextResponse.json({
      firstName: firstName || '',
      lastName: lastName || '',
      email,
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
