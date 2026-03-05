// API Route: POST /api/auth/register-init
// Envia codigo de verificacao de 5 digitos por email

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, emailVerifications } from '@/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { emailService } from '@/lib/email-service'
import { isTransientDbError } from '@/lib/db-error'

async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 3
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isTransientDbError(error) || attempt === maxAttempts) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
    }
  }

  throw lastError
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalido' }, { status: 400 })
    }

    // Verificar se email ja existe
    const existingUser = await withDbRetry(() =>
      db.select().from(users).where(eq(users.email, email)).limit(1),
    )

    if (existingUser.length > 0 && existingUser[0].emailVerified) {
      return NextResponse.json({ error: 'Email ja cadastrado' }, { status: 400 })
    }

    // Verificar rate limit (maximo 3 tentativas nos ultimos 15 minutos)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const recentAttempts = await withDbRetry(() =>
      db
        .select()
        .from(emailVerifications)
        .where(
          and(
            eq(emailVerifications.email, email),
            gt(emailVerifications.createdAt, fifteenMinutesAgo),
          ),
        ),
    )

    if (recentAttempts.length >= 3) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429 },
      )
    }

    // Gerar codigo de 5 digitos
    const code = Math.floor(10000 + Math.random() * 90000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

    // Invalidar codigos anteriores para este email (marcar como expirados)
    await withDbRetry(() =>
      db
        .update(emailVerifications)
        .set({ expiresAt: new Date(Date.now() - 1000) }) // Expirar imediatamente
        .where(eq(emailVerifications.email, email)),
    )

    // Salvar novo codigo em tabela de verificacao
    await withDbRetry(() =>
      db.insert(emailVerifications).values({
        email,
        code,
        expiresAt,
        attempts: 0,
      }),
    )

    // Tentar enviar email com codigo (nao bloqueia se falhar)
    const emailSent = await emailService.sendVerificationCode(email, code)

    // Sempre retorna sucesso, mesmo se o email nao foi enviado.
    // O codigo foi salvo no banco e pode ser validado.
    return NextResponse.json({
      success: true,
      message: emailSent ? 'Codigo enviado por email' : 'Codigo gerado (email nao configurado)',
      // Sempre retornar codigo em desenvolvimento ou quando email nao foi enviado.
      code: process.env.NODE_ENV === 'development' || !emailSent ? code : undefined,
    })
  } catch (error) {
    console.error('Error in register-init:', error)

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
