/**
 * Admin Authentication Library
 * Funções de autenticação segura para o painel admin
 */

import { db } from '@/db'
import { adminUsers, adminSessions } from '@/db/admin-schema'
import { eq, and, gt } from 'drizzle-orm'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const SALT_ROUNDS = 12
const SESSION_DURATION_DAYS = 7
const ADMIN_COOKIE_NAME = 'admin_session'

// ============================================
// PASSWORD HASHING (SEGURO)
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ============================================
// SESSION TOKEN
// ============================================

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

// ============================================
// ADMIN AUTH FUNCTIONS
// ============================================

export type AdminAuthResult = {
  success: boolean
  message?: string
  admin?: {
    id: string
    email: string
    name: string
    role: string
  }
}

export async function loginAdmin(
  email: string, 
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AdminAuthResult> {
  try {
    // Buscar admin por email
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(and(
        eq(adminUsers.email, email.toLowerCase()),
        eq(adminUsers.isActive, true)
      ))
      .limit(1)

    if (!admin) {
      return { success: false, message: 'Credenciais inválidas' }
    }

    // Verificar senha
    const isValidPassword = await verifyPassword(password, admin.hashedPassword)
    if (!isValidPassword) {
      return { success: false, message: 'Credenciais inválidas' }
    }

    // Criar sessão
    const token = generateSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)

    await db.insert(adminSessions).values({
      adminId: admin.id,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    })

    // Atualizar último login
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(adminUsers.id, admin.id))

    // Definir cookie
    const cookieStore = await cookies()
    cookieStore.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/admin',
    })

    return {
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    }
  } catch (error) {
    console.error('Admin login error:', error)
    return { success: false, message: 'Erro interno do servidor' }
  }
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value

  if (token) {
    // Invalidar sessão no banco
    await db
      .update(adminSessions)
      .set({ expiresAt: new Date() })
      .where(eq(adminSessions.token, token))

    // Remover cookie
    cookieStore.delete(ADMIN_COOKIE_NAME)
  }
}

export async function getAdminFromSession(): Promise<AdminAuthResult['admin'] | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value

    if (!token) return null

    // Buscar sessão válida
    const [session] = await db
      .select()
      .from(adminSessions)
      .where(and(
        eq(adminSessions.token, token),
        gt(adminSessions.expiresAt, new Date())
      ))
      .limit(1)

    if (!session) return null

    // Buscar admin
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(and(
        eq(adminUsers.id, session.adminId),
        eq(adminUsers.isActive, true)
      ))
      .limit(1)

    if (!admin) return null

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    }
  } catch (error) {
    console.error('Get admin from session error:', error)
    return null
  }
}

export async function requireAdmin(): Promise<NonNullable<AdminAuthResult['admin']>> {
  const admin = await getAdminFromSession()
  if (!admin) {
    throw new Error('Unauthorized')
  }
  return admin
}

export async function requireRole(allowedRoles: string[]): Promise<NonNullable<AdminAuthResult['admin']>> {
  const admin = await requireAdmin()
  if (!allowedRoles.includes(admin.role)) {
    throw new Error('Forbidden')
  }
  return admin
}

// ============================================
// ADMIN USER MANAGEMENT
// ============================================

export async function createAdminUser(data: {
  email: string
  name: string
  password: string
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SUPPORT'
}): Promise<{ success: boolean; adminId?: string; error?: string }> {
  try {
    // Verificar se email já existe
    const existing = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.email, data.email.toLowerCase()))
      .limit(1)

    if (existing.length > 0) {
      return { success: false, error: 'Email já cadastrado' }
    }

    const hashedPassword = await hashPassword(data.password)

    const [admin] = await db
      .insert(adminUsers)
      .values({
        email: data.email.toLowerCase(),
        name: data.name,
        hashedPassword,
        role: data.role || 'SUPPORT',
      })
      .returning({ id: adminUsers.id })

    return { success: true, adminId: admin.id }
  } catch (error) {
    console.error('Create admin user error:', error)
    return { success: false, error: 'Erro ao criar usuário' }
  }
}

// ============================================
// SEED INITIAL ADMIN
// ============================================

export async function seedInitialAdmin(): Promise<void> {
  const email = 'growthhub85@gmail.com'
  
  // Verificar se já existe
  const existing = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1)

  if (existing.length > 0) {
    console.log('Admin já existe:', email)
    return
  }

  const result = await createAdminUser({
    email,
    name: 'Growth Hub Admin',
    password: 'growthhubRiviera2025@',
    role: 'SUPER_ADMIN',
  })

  if (result.success) {
    console.log('✅ Admin criado:', email)
  } else {
    console.error('❌ Erro ao criar admin:', result.error)
  }
}
