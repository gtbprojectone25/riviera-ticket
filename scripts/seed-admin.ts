import { db } from '@/db'
import { adminUsers } from '@/db/admin-schema'
import { hashPassword } from '@/lib/password'

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SUPPORT'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@riviera.local'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Riviera!2026-8FjQ9vL2'
const ADMIN_NAME = process.env.ADMIN_NAME ?? 'Admin'
const ADMIN_ROLE = (process.env.ADMIN_ROLE ?? 'ADMIN') as AdminRole

async function seedAdmin() {
  const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase()
  const hashedPassword = await hashPassword(ADMIN_PASSWORD)
  const now = new Date()

  const [admin] = await db
    .insert(adminUsers)
    .values({
      email: normalizedEmail,
      name: ADMIN_NAME,
      hashedPassword,
      role: ADMIN_ROLE,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: adminUsers.email,
      set: {
        name: ADMIN_NAME,
        hashedPassword,
        role: ADMIN_ROLE,
        isActive: true,
        updatedAt: now,
      },
    })
    .returning()

  console.log('Admin ready:', {
    id: admin?.id,
    email: admin?.email,
    role: admin?.role,
  })
}

seedAdmin().catch((err) => {
  console.error(err)
  process.exit(1)
})
