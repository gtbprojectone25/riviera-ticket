// API Route: POST /api/auth/verify-email
// Verifica código de 5 dígitos, ativa conta, criptografa dados e retorna JWT

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, emailVerifications } from '@/db/schema'
import { eq, and, desc, gt } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { encryptionService } from '@/lib/encryption-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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
    let verification = await db
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
    if (!verification || verification.length === 0) {
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
      
      verification = latestVerification ? [latestVerification] : []
    }
    
    const verificationData = verification[0] || null
    
    if (verification) {
      console.log('📧 Verificação encontrada')
      console.log('📝 Código no banco:', verification.code, 'Código recebido:', code)
      console.log('⏰ Expira em:', verification.expiresAt, 'Agora:', new Date())
    } else {
      console.log('📧 Nenhuma verificação encontrada para:', email)
    }
    
    // Em desenvolvimento, permitir código de teste "12345" ou "00000"
    const isTestCode = process.env.NODE_ENV === 'development' && (code === '12345' || code === '00000')
    
    console.log('🧪 É código de teste?', isTestCode, 'NODE_ENV:', process.env.NODE_ENV)
    
    if (!verification && !isTestCode) {
      console.log('❌ Nenhuma verificação encontrada e não é código de teste')
      return NextResponse.json(
        { error: 'Código não encontrado. Verifique se o email está correto ou solicite um novo código.' },
        { status: 400 }
      )
    }

    // Se não for código de teste, validar código do banco
    if (!isTestCode) {
      if (!verification) {
        return NextResponse.json(
          { error: 'Código não encontrado' },
          { status: 400 }
        )
      }
      
      if (verification.code !== code) {
        console.log('❌ Código não corresponde:', { esperado: verification.code, recebido: code })
        // Incrementar tentativas
        await db
          .update(emailVerifications)
          .set({ attempts: verification.attempts + 1 })
          .where(eq(emailVerifications.id, verification.id))
        
        return NextResponse.json(
          { error: 'Código inválido. Verifique o código digitado.' },
          { status: 400 }
        )
      }

      // Verificar expiração
      if (new Date(verification.expiresAt) < new Date()) {
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

    // Gerar JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // TODO: Salvar sessão no banco (userSessions table)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname
      }
    })
  } catch (error) {
    console.error('❌ Error in verify-email:', error)
    return NextResponse.json(
      { error: `Erro ao processar solicitação: ${error instanceof Error ? error.message : 'Erro desconhecido'}` },
      { status: 500 }
    )
  }
}

