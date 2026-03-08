import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, emailVerifications } from '@/db/schema'
import { and, desc, eq, gt, sql } from 'drizzle-orm'
import { hashPassword } from '@/lib/password'
import { withDbRetry } from '@/lib/db-retry'
import { isTransientDbError } from '@/lib/db-error'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const code = String(body?.code ?? '').trim()
    const password = String(body?.password ?? '')

    if (!email || !email.includes('@') || !code || !password) {
      return NextResponse.json({ error: 'Email, codigo e nova senha sao obrigatorios' }, { status: 400 })
    }

    if (!/^\d{5}$/.test(code)) {
      return NextResponse.json({ error: 'Codigo invalido. Use 5 digitos.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    const now = new Date()

    // Validate a non-expired code that matches the email.
    const [verification] = await withDbRetry(() =>
      db
        .select()
        .from(emailVerifications)
        .where(
          and(
            sql`lower(${emailVerifications.email}) = ${email}`,
            eq(emailVerifications.code, code),
            gt(emailVerifications.expiresAt, now),
          ),
        )
        .orderBy(desc(emailVerifications.createdAt))
        .limit(1),
    )

    if (!verification) {
      return NextResponse.json({ error: 'Codigo invalido ou expirado' }, { status: 400 })
    }

    const [user] = await withDbRetry(() =>
      db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1),
    )

    if (!user) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
    }

    const hashedPassword = await hashPassword(password)

    await withDbRetry(() =>
      db
        .update(users)
        .set({ hashedPassword, updatedAt: now })
        .where(eq(users.id, user.id)),
    )

    // Invalidate this specific code after successful password reset.
    await withDbRetry(() =>
      db
        .update(emailVerifications)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(emailVerifications.id, verification.id)),
    )

    return NextResponse.json({ success: true, message: 'Senha redefinida com sucesso.' })
  } catch (error) {
    console.error('Error in reset-password:', error)

    if (isTransientDbError(error)) {
      return NextResponse.json(
        { error: 'Servico temporariamente indisponivel. Tente novamente.' },
        { status: 503 },
      )
    }

    return NextResponse.json(
      { error: 'Erro ao processar solicitacao' },
      { status: 500 },
    )
  }
}
