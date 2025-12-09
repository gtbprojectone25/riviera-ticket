/**
 * Password Utilities - Secure password hashing using bcrypt
 * 
 * IMPORTANTE: Este módulo substitui o hash Base64 inseguro por bcrypt
 */

import bcrypt from 'bcryptjs'

// Custo do bcrypt (10-12 é recomendado para produção)
const SALT_ROUNDS = 12

/**
 * Hash de senha usando bcrypt
 * @param password - Senha em texto plano
 * @returns Hash bcrypt seguro
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verifica se a senha corresponde ao hash
 * @param password - Senha em texto plano
 * @param hash - Hash bcrypt armazenado
 * @returns true se corresponder, false caso contrário
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Verifica se um hash é um hash bcrypt válido
 * Útil para migração de senhas antigas (Base64)
 */
export function isBcryptHash(hash: string): boolean {
  // Hashes bcrypt começam com $2a$, $2b$ ou $2y$
  return /^\$2[aby]\$\d{2}\$/.test(hash)
}

/**
 * Verifica se é um hash Base64 legado (inseguro)
 * Usado apenas para migração
 */
export function isLegacyBase64Hash(hash: string): boolean {
  try {
    // Tenta decodificar como Base64
    const decoded = Buffer.from(hash, 'base64').toString('utf8')
    // Se decodificar sem erros e não parecer hash bcrypt, é legado
    return decoded.length > 0 && !isBcryptHash(hash)
  } catch {
    return false
  }
}

/**
 * Verifica senha com suporte a migração de hash legado
 * Se a senha estiver em Base64 legado e for válida, 
 * retorna um flag indicando que precisa ser atualizada
 */
export async function verifyPasswordWithMigration(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  // Primeiro, tenta verificar como bcrypt
  if (isBcryptHash(storedHash)) {
    const valid = await verifyPassword(password, storedHash)
    return { valid, needsRehash: false }
  }

  // Se não for bcrypt, tenta como Base64 legado
  if (isLegacyBase64Hash(storedHash)) {
    const legacyHash = Buffer.from(password).toString('base64')
    const valid = legacyHash === storedHash
    return { valid, needsRehash: valid } // Se válido, precisa atualizar
  }

  // Hash não reconhecido
  return { valid: false, needsRehash: false }
}
