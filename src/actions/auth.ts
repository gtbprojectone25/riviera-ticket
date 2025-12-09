'use server'

import { db } from '@/db'
import { users, userSessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { 
  hashPassword, 
  verifyPasswordWithMigration 
} from '@/lib/password'

type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
  user?: {
    id: string
    name: string
    email: string
  }
}

function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
})

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  surname: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  ssn: z.string().optional()
})

export async function loginUser(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  try {
    const rawFormData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string
    }

    const validatedFields = loginSchema.safeParse(rawFormData)

    if (!validatedFields.success) {
      return {
        success: false,
        message: 'Campos inválidos',
        errors: validatedFields.error.flatten().fieldErrors
      }
    }

    const { email, password } = validatedFields.data

    // Buscar usuário por email
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser.length === 0) {
      return {
        success: false,
        message: 'Email ou senha incorretos'
      }
    }

    const user = existingUser[0]

    // Verificar senha com suporte a migração de hash legado
    const { valid: isValidPassword, needsRehash } = await verifyPasswordWithMigration(
      password, 
      user.hashedPassword || ''
    )

    if (!isValidPassword) {
      return {
        success: false,
        message: 'Email ou senha incorretos'
      }
    }

    // Se a senha estava em hash legado, atualizar para bcrypt
    if (needsRehash) {
      const newHash = await hashPassword(password)
      await db
        .update(users)
        .set({ hashedPassword: newHash, updatedAt: new Date() })
        .where(eq(users.id, user.id))
      console.log(`[Auth] Senha do usuário ${user.email} migrada para bcrypt`)
    }

    // Criar sessão
    const sessionToken = generateSessionToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias

    await db.insert(userSessions).values({
      userId: user.id,
      sessionToken,
      expiresAt
    })

    // Definir cookie
    const cookieStore = await cookies()
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt
    })

    return {
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    }

  } catch (error) {
    console.error('Erro no login:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}

export async function registerUser(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  try {
    const rawFormData = {
      name: formData.get('name') as string,
      surname: formData.get('surname') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      ssn: formData.get('ssn') as string
    }

    const validatedFields = registerSchema.safeParse(rawFormData)

    if (!validatedFields.success) {
      return {
        success: false,
        message: 'Campos inválidos',
        errors: validatedFields.error.flatten().fieldErrors
      }
    }

    const { name, surname, email, password } = validatedFields.data

    // Verificar se email já existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser.length > 0) {
      return {
        success: false,
        message: 'Email já está em uso'
      }
    }

    // Hash da senha (agora usando bcrypt assíncrono)
    const hashedPasswordValue = await hashPassword(password)

    // Criar usuário
    const newUser = await db.insert(users).values({
      name,
      surname, 
      email,
      hashedPassword: hashedPasswordValue,
      emailVerified: false
    }).returning()

    // Criar sessão
    const sessionToken = generateSessionToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias

    await db.insert(userSessions).values({
      userId: newUser[0].id,
      sessionToken,
      expiresAt
    })

    // Definir cookie
    const cookieStore = await cookies()
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt
    })

    return {
      success: true,
      message: 'Conta criada com sucesso',
      user: {
        id: newUser[0].id,
        name: newUser[0].name,
        email: newUser[0].email
      }
    }

  } catch (error) {
    console.error('Erro no registro:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}

export async function logoutUser() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (sessionToken) {
      // Remover sessão do banco
      await db.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken))
    }

    // Remover cookie
    cookieStore.delete('session')

    return {
      success: true,
      message: 'Logout realizado com sucesso'
    }

  } catch (error) {
    console.error('Erro no logout:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return { success: false, message: 'Não autenticado' }
    }

    // Buscar sessão válida
    const session = await db
      .select({
        user: users,
        session: userSessions
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(eq(userSessions.sessionToken, sessionToken))
      .limit(1)

    if (session.length === 0) {
      return { success: false, message: 'Sessão inválida' }
    }

    // Verificar se sessão não expirou
    if (session[0].session.expiresAt < new Date()) {
      // Remover sessão expirada
      await db.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken))
      cookieStore.delete('session')
      
      return { success: false, message: 'Sessão expirada' }
    }

    return {
      success: true,
      user: {
        id: session[0].user.id,
        name: session[0].user.name,
        email: session[0].user.email,
        emailVerified: session[0].user.emailVerified
      }
    }

  } catch (error) {
    console.error('Erro ao buscar usuário atual:', error)
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}