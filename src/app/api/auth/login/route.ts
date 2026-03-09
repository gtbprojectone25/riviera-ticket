// API Route: POST /api/auth/login
// Authenticates user and creates session cookie

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, userSessions } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { hashPassword, verifyPasswordWithMigration } from '@/lib/password'
import { withDbRetry } from '@/lib/db-retry'
import { isTransientDbError } from '@/lib/db-error'

function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return NextResponse.json(
        { error: 'Email e senha sao obrigatorios' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    const [user] = await withDbRetry(() =>
      db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${normalizedEmail}`)
        .limit(1),
    )

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais invalidas' },
        { status: 401 }
      )
    }

    if (!user.hashedPassword) {
      return NextResponse.json(
        { error: 'PASSWORD_NOT_SET' },
        { status: 401 }
      )
    }

    const { valid: isValid, needsRehash } = await verifyPasswordWithMigration(
      password,
      user.hashedPassword
    )

    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciais invalidas' },
        { status: 401 }
      )
    }

    if (needsRehash) {
      const newHash = await hashPassword(password)
      await withDbRetry(() =>
        db
          .update(users)
          .set({ hashedPassword: newHash, updatedAt: new Date() })
          .where(eq(users.id, user.id)),
      )
    }

    const sessionToken = generateSessionToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await withDbRetry(() =>
      db.insert(userSessions).values({
        userId: user.id,
        sessionToken,
        expiresAt,
      }),
    )

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
      },
    })

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    })

    return response
  } catch (error) {
    console.error('Erro ao fazer login:', error)

    if (isTransientDbError(error)) {
      return NextResponse.json(
        { error: 'Servico temporariamente indisponivel. Tente novamente.' },
        { status: 503 }
      )
    }

    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes('database_url')) {
      return NextResponse.json(
        { error: 'Configuracao de banco ausente no ambiente de deploy.' },
        { status: 503 }
      )
    }
    if (message.toLowerCase().includes('user_sessions') || message.toLowerCase().includes('relation')) {
      return NextResponse.json(
        { error: 'Banco sem migracoes atualizadas para login.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
