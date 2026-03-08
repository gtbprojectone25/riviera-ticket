import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { emailVerifications } from '@/db/schema'
import { and, desc, eq, gt, sql } from 'drizzle-orm'
import { withDbRetry } from '@/lib/db-retry'
import { isTransientDbError } from '@/lib/db-error'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const code = String(body?.code ?? '').trim()

    if (!email || !email.includes('@') || !code) {
      return NextResponse.json({ error: 'Email e codigo sao obrigatorios' }, { status: 400 })
    }

    if (!/^\d{5}$/.test(code)) {
      return NextResponse.json({ error: 'Codigo invalido. Use 5 digitos.' }, { status: 400 })
    }

    const now = new Date()

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

    // Keep code valid until reset-password step.
    return NextResponse.json({ success: true, message: 'Codigo verificado com sucesso.' })
  } catch (error) {
    console.error('Error in verify-code:', error)

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
