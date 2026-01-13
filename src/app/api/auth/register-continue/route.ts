// API Route: POST /api/auth/register-continue
// Salva informações do usuário (name, surname, SSN) e valida unicidade do SSN

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { encryptionService } from '@/lib/encryption-service'
import { webhookService } from '@/lib/webhook-service'

export async function POST(request: NextRequest) {
  try {
    const { email, name, surname, ssn } = await request.json()

    // Validações
    if (!name || !surname || !ssn) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar formato SSN (9 dígitos)
    const ssnDigits = ssn.replace(/\D/g, '')
    if (ssnDigits.length !== 9) {
      return NextResponse.json(
        { error: 'SSN deve ter 9 dígitos' },
        { status: 400 }
      )
    }

    // Verificar unicidade do SSN para esta sessão/evento
    // Implementar regra: 1 SSN = 1 compra por sessão
    const ssnHash = encryptionService.hashSSN(ssnDigits)
    
    // TODO: Verificar se SSN já foi usado para esta sessão específica
    // Por enquanto, verificar apenas se já existe no sistema
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.ssnHash, ssnHash))
      .limit(1)

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Este SSN já foi utilizado' },
        { status: 400 }
      )
    }

    // Criptografar SSN antes de salvar
    const encryptedSSN = encryptionService.encrypt(ssnDigits)

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
          encryptedSsn: encryptedSSN,
          ssnHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingEmailUser.id))
    } else {
      // Criar novo usuário
      await db.insert(users).values({
        email,
        name,
        surname,
        encryptedSsn: encryptedSSN,
        ssnHash,
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

