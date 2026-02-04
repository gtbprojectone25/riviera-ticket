import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, userSessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '@/lib/password'

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

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 },
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters' },
        { status: 400 },
      )
    }

    // Get current user password
    const [userWithPassword] = await db
      .select({
        hashedPassword: users.hashedPassword,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (!userWithPassword || !userWithPassword.hashedPassword) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, userWithPassword.hashedPassword)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 },
      )
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update password
    await db
      .update(users)
      .set({
        hashedPassword,
      })
      .where(eq(users.id, user.id))

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
