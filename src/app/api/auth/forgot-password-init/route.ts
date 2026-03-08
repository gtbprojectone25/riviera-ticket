import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, emailVerifications } from '@/db/schema'
import { eq, and, gt, sql } from 'drizzle-orm'
import { emailService } from '@/lib/email-service'
import { withDbRetry } from '@/lib/db-retry'
import { isTransientDbError } from '@/lib/db-error'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email ?? '').trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    // 1. Verificar se o email existe no banco de dados
    const existingUser = await withDbRetry(() =>
      db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1),
    )

    if (existingUser.length === 0) {
      // Retornar sucesso mesmo se o email não for encontrado para evitar enumeração de usuários
      return NextResponse.json({ success: true, message: 'Se o email estiver cadastrado, um código será enviado.' })
    }

    // 2. Verificar rate limit (máximo 3 tentativas nos últimos 15 minutos)
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

    // 3. Gerar código de 5 dígitos
    const code = Math.floor(10000 + Math.random() * 90000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

    // 4. Invalidar códigos anteriores para este email (marcar como expirados)
    await withDbRetry(() =>
      db
        .update(emailVerifications)
        .set({ expiresAt: new Date(Date.now() - 1000) }) // Expirar imediatamente
        .where(eq(emailVerifications.email, email)),
    )

    // 5. Salvar novo código em tabela de verificacao
    await withDbRetry(() =>
      db.insert(emailVerifications).values({
        email,
        code,
        expiresAt,
        attempts: 0,
      }),
    )

    // 6. Tentar enviar email com codigo (não bloqueia se falhar)
    const emailSent = await emailService.sendVerificationCode(email, code, 'password_reset')

    // Sempre retorna sucesso, mesmo se o email não foi enviado.
    // O código foi salvo no banco e pode ser validado.
    return NextResponse.json({
      success: true,
      message: emailSent ? 'Código enviado por email' : 'Código gerado (email não configurado)',
      // Sempre retornar código em desenvolvimento ou quando email não foi enviado.
      code: process.env.NODE_ENV === 'development' || !emailSent ? code : undefined,
    })
  } catch (error) {
    console.error('Error in forgot-password-init:', error)

    if (isTransientDbError(error)) {
      return NextResponse.json(
        { error: 'Serviço temporariamente indisponível. Tente novamente.' },
        { status: 503 },
      )
    }

    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 },
    )
  }
}
