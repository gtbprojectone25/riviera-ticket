// API Route: POST /api/auth/register-init
// Envia código de verificação de 5 dígitos por email

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, emailVerifications } from '@/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { emailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1)
    
    if (existingUser.length > 0 && existingUser[0].emailVerified) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      )
    }

    // Verificar rate limit (máximo 3 tentativas nos últimos 15 minutos)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const recentAttempts = await db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.email, email),
          gt(emailVerifications.createdAt, fifteenMinutesAgo)
        )
      )

    if (recentAttempts.length >= 3) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429 }
      )
    }

    // Gerar código de 5 dígitos
    const code = Math.floor(10000 + Math.random() * 90000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

    // Invalidar códigos anteriores para este email (marcar como expirados)
    await db
      .update(emailVerifications)
      .set({ expiresAt: new Date(Date.now() - 1000) }) // Expirar imediatamente
      .where(eq(emailVerifications.email, email))

    // Salvar novo código em tabela de verificação
    await db.insert(emailVerifications).values({
      email,
      code,
      expiresAt,
      attempts: 0,
    })

    // Tentar enviar email com código (não bloqueia se falhar)
    const emailSent = await emailService.sendVerificationCode(email, code)

    // Sempre retorna sucesso, mesmo se o email não foi enviado
    // O código foi salvo no banco e pode ser validado
    return NextResponse.json({
      success: true,
      message: emailSent ? 'Código enviado por email' : 'Código gerado (email não configurado)',
      // Sempre retornar código em desenvolvimento ou quando email não foi enviado
      code: (process.env.NODE_ENV === 'development' || !emailSent) ? code : undefined
    })
  } catch (error) {
    console.error('Error in register-init:', error)
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    )
  }
}
