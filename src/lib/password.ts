/**
 * Password Utilities - Secure password hashing using bcrypt
 *
 * IMPORTANT: This module migrates legacy Base64/Argon2 hashes to bcrypt.
 */

import bcrypt from 'bcryptjs'
import argon2 from 'argon2'

// Bcrypt cost (10-12 recommended)
const SALT_ROUNDS = 12

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify password against bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Detect bcrypt hashes ($2a$, $2b$, $2y$)
 */
export function isBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(hash)
}

/**
 * Detect Argon2 hashes ($argon2...)
 */
export function isArgon2Hash(hash: string): boolean {
  return hash.startsWith('$argon2')
}

/**
 * Detect legacy Base64 hashes (insecure)
 */
export function isLegacyBase64Hash(hash: string): boolean {
  if (!hash || isBcryptHash(hash) || isArgon2Hash(hash)) return false
  if (!/^[A-Za-z0-9+/=]+$/.test(hash)) return false
  try {
    const decoded = Buffer.from(hash, 'base64').toString('utf8')
    return decoded.length > 0 && !isBcryptHash(hash)
  } catch {
    return false
  }
}

/**
 * Verify password with migration support (bcrypt/argon2/legacy Base64).
 * When legacy/argon2 is valid, caller should rehash to bcrypt.
 */
export async function verifyPasswordWithMigration(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedHash) return { valid: false, needsRehash: false }

  if (isBcryptHash(storedHash)) {
    const valid = await verifyPassword(password, storedHash)
    return { valid, needsRehash: false }
  }

  if (isArgon2Hash(storedHash)) {
    try {
      const valid = await argon2.verify(storedHash, password)
      return { valid, needsRehash: valid }
    } catch {
      return { valid: false, needsRehash: false }
    }
  }

  if (isLegacyBase64Hash(storedHash)) {
    const legacyHash = Buffer.from(password).toString('base64')
    const valid = legacyHash === storedHash
    return { valid, needsRehash: valid }
  }

  return { valid: false, needsRehash: false }
}
