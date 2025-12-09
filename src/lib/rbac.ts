/**
 * RBAC (Role-Based Access Control) Utilities
 * 
 * Helpers para verificar permissões de usuário
 */

import { db } from '@/db'
import { users, userSessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN'

export type AuthenticatedUser = {
  id: string
  email: string
  name: string
  surname: string
  role: UserRole
  emailVerified: boolean
}

/**
 * Obtém o usuário atual da sessão
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return null
    }

    const result = await db
      .select({
        user: users,
        session: userSessions,
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(eq(userSessions.sessionToken, sessionToken))
      .limit(1)

    if (result.length === 0) {
      return null
    }

    const { user, session } = result[0]

    // Verificar expiração
    if (session.expiresAt < new Date()) {
      await db.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken))
      cookieStore.delete('session')
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      role: (user.role as UserRole) || 'USER',
      emailVerified: user.emailVerified ?? false,
    }
  } catch (error) {
    console.error('Erro ao obter usuário:', error)
    return null
  }
}

/**
 * Requer autenticação - redireciona para login se não autenticado
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return user
}

/**
 * Requer role específico
 * @param allowedRoles - Roles permitidos para acessar
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth()
  
  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized')
  }
  
  return user
}

/**
 * Requer role de admin (ADMIN ou SUPER_ADMIN)
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  return requireRole(['ADMIN', 'SUPER_ADMIN'])
}

/**
 * Requer role de super admin
 */
export async function requireSuperAdmin(): Promise<AuthenticatedUser> {
  return requireRole(['SUPER_ADMIN'])
}

/**
 * Verifica se usuário tem permissão (sem redirecionar)
 */
export async function hasRole(allowedRoles: UserRole[]): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null && allowedRoles.includes(user.role)
}

/**
 * Verifica se é admin (sem redirecionar)
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole(['ADMIN', 'SUPER_ADMIN'])
}

/**
 * Atualiza role de um usuário
 * Apenas SUPER_ADMIN pode executar
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
  executorId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verificar se executor é SUPER_ADMIN
    const [executor] = await db
      .select()
      .from(users)
      .where(eq(users.id, executorId))

    if (!executor || executor.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        message: 'Apenas SUPER_ADMIN pode alterar roles',
      }
    }

    // Não permitir remover o próprio SUPER_ADMIN
    if (targetUserId === executorId && newRole !== 'SUPER_ADMIN') {
      return {
        success: false,
        message: 'Não é possível remover seu próprio privilégio de SUPER_ADMIN',
      }
    }

    // Atualizar role
    await db
      .update(users)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(users.id, targetUserId))

    return {
      success: true,
      message: `Role atualizado para ${newRole}`,
    }
  } catch (error) {
    console.error('Erro ao atualizar role:', error)
    return {
      success: false,
      message: 'Erro ao atualizar role',
    }
  }
}
