// API Route: POST /api/auth/register-continue
// Salva informações do usuário (name, surname) após o email

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { webhookService } from '@/lib/webhook-service'

export async function POST(request: NextRequest) {
  try {
    const { email, name, surname } = await request.json()

    // Validações
    if (!email || !name || !surname) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    // Salvar ou atualizar usuário parcial
    const [existingEmailUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingEmailUser) {
      // Atualizar usuário existente
      await db
        .update(users)
        .set({
          name,
          surname,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingEmailUser.id))
    } else {
      // Criar novo usuário
      await db.insert(users).values({
        email,
        name,
        surname,
        emailVerified: false,
      })
    }

    // Enviar webhook de cadastro para API externa
    webhookService.sendCadastroWebhook({
      email,
      name,
      surname
    }).catch(error => {
      console.error('Erro ao enviar webhook de cadastro (não bloqueia o fluxo):', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Informações salvas com sucesso'
    })
  } catch (error) {
    console.error('Error in register-continue:', error)
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    )
  }
}
