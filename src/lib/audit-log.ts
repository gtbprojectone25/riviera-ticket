/**
 * Admin audit log helper
 * Centralizes audit log writes for admin actions
 */

import { db } from '@/db'
import { auditLogs } from '@/db/admin-schema'

type AuditLogInput = {
  adminId: string | null
  action: string
  entity: string
  entityId?: string | null
  oldValues?: unknown
  newValues?: unknown
  ipAddress?: string | null
  userAgent?: string | null
}

function toJsonSafe(value: unknown) {
  if (value === undefined) return null
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return null
  }
}

export async function writeAuditLog(input: AuditLogInput) {
  try {
    await db.insert(auditLogs).values({
      adminId: input.adminId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      oldValues: toJsonSafe(input.oldValues),
      newValues: toJsonSafe(input.newValues),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }
}
