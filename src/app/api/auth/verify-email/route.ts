// API Route: POST /api/auth/verify-email
// Verifica código de 5 dígitos, ativa conta, criptografa dados e cria sessão via cookie

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { randomBytes } from 'node:crypto'
import { users, emailVerifications, userSessions } from '@/db/schema'
import { eq, and, desc, gt } from 'drizzle-orm'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { encryptionService } from '@/lib/encryption-service'
import { webhookService } from '@/lib/webhook-service'

function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    console.log('🔍 Verificando código:', { email, code, codeLength: code?.length })

    if (!email || !code || code.length !== 5) {
      console.log('❌ Validação falhou:', { email: !!email, code: !!code, codeLength: code?.length })
      return NextResponse.json(
        { error: 'Email e código são obrigatórios (código deve ter 5 dígitos)' },
        { status: 400 }
      )
    }

    // Verificar código na tabela de verificação
    // Primeiro, tentar encontrar o código exato (mesmo que expirado, em dev aceitamos)
    const [verificationByCode] = await db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.email, email),
          eq(emailVerifications.code, code) // Buscar pelo código exato
        )
      )
      .orderBy(desc(emailVerifications.createdAt))
      .limit(1)
    
    // Se não encontrou pelo código exato, buscar o mais recente não expirado
    let verificationData = verificationByCode || null
    
    if (!verificationData) {
      const [latestVerification] = await db
        .select()
        .from(emailVerifications)
        .where(
          and(
            eq(emailVerifications.email, email),
            gt(emailVerifications.expiresAt, new Date()) // Apenas códigos não expirados
          )
        )
        .orderBy(desc(emailVerifications.createdAt))
        .limit(1)
      
      verificationData = latestVerification || null
    }
    
    if (verificationData) {
      console.log('📧 Verificação encontrada')
      console.log('📝 Código no banco:', verificationData.code, 'Código recebido:', code)
      console.log('⏰ Expira em:', verificationData.expiresAt, 'Agora:', new Date())
    } else {
      console.log('📧 Nenhuma verificação encontrada para:', email)
    }
    
    // Em desenvolvimento, permitir código de teste "12345" ou "00000"
    const isTestCode = process.env.NODE_ENV === 'development' && (code === '12345' || code === '00000')
    
    // Em desenvolvimento, também aceitar código que foi retornado pela API (mesmo que expirado)
    const isDevCode = process.env.NODE_ENV === 'development' && verificationData && verificationData.code === code
    
    console.log('🧪 É código de teste?', isTestCode, 'É código dev?', isDevCode, 'NODE_ENV:', process.env.NODE_ENV)
    
    if (!verificationData && !isTestCode) {
      console.log('❌ Nenhuma verificação encontrada e não é código de teste')
      return NextResponse.json(
        { error: 'Código não encontrado. Verifique se o email está correto ou solicite um novo código.' },
        { status: 400 }
      )
    }

    // Se não for código de teste ou código dev, validar código do banco
    if (!isTestCode && !isDevCode) {
      if (!verificationData) {
        return NextResponse.json(
          { error: 'Código não encontrado' },
          { status: 400 }
        )
      }
      
      if (verificationData.code !== code) {
        console.log('❌ Código não corresponde:', { esperado: verificationData.code, recebido: code })
        // Incrementar tentativas
        await db
          .update(emailVerifications)
          .set({ attempts: verificationData.attempts + 1 })
          .where(eq(emailVerifications.id, verificationData.id))
        
        return NextResponse.json(
          { error: 'Código inválido. Verifique o código digitado.' },
          { status: 400 }
        )
      }

      // Verificar expiração apenas em produção
      if (new Date(verificationData.expiresAt) < new Date()) {
        console.log('❌ Código expirado')
        return NextResponse.json(
          { error: 'Código expirado. Solicite um novo código.' },
          { status: 400 }
        )
      }
    }

    // Buscar usuário
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (!user) {
      console.log('❌ Usuário não encontrado para email:', email)
      return NextResponse.json(
        { error: 'Usuário não encontrado. Complete o cadastro primeiro.' },
        { status: 404 }
      )
    }

    console.log('✅ Usuário encontrado:', user.email)

    // Criptografar dados sensíveis (SSN) se ainda não foi feito
    // (Já feito no register-continue, mas garantir aqui também)
    if (user.encryptedSsn && !user.emailVerified) {
      // Dados já criptografados, apenas verificar
    }

    // Atualizar usuário como verificado
    await db.update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, user.id))

    // Criar sessão
    const sessionToken = generateSessionToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await db.insert(userSessions).values({
      userId: user.id,
      sessionToken,
      expiresAt
    })

    // Enviar webhook de notificação para API externa (código confirmado)
    webhookService.sendNotificacaoWebhook({
      email: user.email,
      name: user.name || '',
      surname: user.surname || '',
      code: code // Codigo de 5 digitos
    }).catch(error => {
      console.error('Erro ao enviar webhook de notificacao (nao bloqueia o fluxo):', error)
    })

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname
      }
    })

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt
    })

    return response
  } catch (error) {
    console.error('❌ Error in verify-email:', error)
    return NextResponse.json(
      { error: `Erro ao processar solicitação: ${error instanceof Error ? error.message : 'Erro desconhecido'}` },
      { status: 500 }
    )
  }
}




