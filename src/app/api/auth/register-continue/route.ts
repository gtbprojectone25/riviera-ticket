// API Route: POST /api/auth/register-continue
// Salva informaÃ§Ãµes do usuÃ¡rio (name, surname) apÃ³s o email

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { webhookService } from '@/lib/webhook-service'

export async function POST(request: NextRequest) {
  try {
    const { email, name, surname } = await request.json()

    // ValidaÃ§Ãµes
    if (!email || !name || !surname) {
      return NextResponse.json(
        { error: 'Todos os campos sÃ£o obrigatÃ³rios' },
        { status: 400 }
      )
    }

    // Salvar ou atualizar usuÃ¡rio parcial
    const [existingEmailUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingEmailUser) {
      // Atualizar usuÃ¡rio existente
      await db
        .update(users)
        .set({
          name,
          surname,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingEmailUser.id))
    } else {
      // Criar novo usuÃ¡rio
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
      console.error('Erro ao enviar webhook de cadastro (nÃ£o bloqueia o fluxo):', error)
    })

    return NextResponse.json({
      success: true,
      message: 'InformaÃ§Ãµes salvas com sucesso'
    })
  } catch (error) {
    console.error('Error in register-continue:', error)
    return NextResponse.json(
      { error: 'Erro ao processar solicitaÃ§Ã£o' },
      { status: 500 }
    )
  }
}
