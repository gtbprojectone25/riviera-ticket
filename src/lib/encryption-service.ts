/**
 * Encryption Service
 * Handles encryption/decryption of sensitive data (SSN)
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16

class EncryptionService {
  private encryptionKey: Buffer

  constructor() {
    // Get encryption key from environment or generate one (for dev only)
    const keyString = process.env.ENCRYPTION_KEY
    
    if (!keyString) {
      console.warn('ENCRYPTION_KEY not set. Using default key (NOT SECURE FOR PRODUCTION)')
      this.encryptionKey = crypto.scryptSync('default-key-change-in-production', 'salt', KEY_LENGTH)
    } else {
      // Key should be base64 encoded 32-byte key
      this.encryptionKey = Buffer.from(keyString, 'base64')
      if (this.encryptionKey.length !== KEY_LENGTH) {
        throw new Error('ENCRYPTION_KEY must be a base64-encoded 32-byte key')
      }
    }
  }

  /**
   * Encrypt sensitive data (SSN)
   */
  encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(IV_LENGTH)
      const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv)

      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const authTag = cipher.getAuthTag()

      // Combine IV + AuthTag + EncryptedData
      const combined = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted

      return Buffer.from(combined).toString('base64')
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt sensitive data (SSN)
   */
  decrypt(encryptedData: string): string {
    try {
      // Preserve the IV:authTag:ciphertext structure by decoding as UTF-8
      const combined = Buffer.from(encryptedData, 'base64').toString('utf8')
      const parts = combined.split(':')

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }

      const iv = Buffer.from(parts[0], 'hex')
      const authTag = Buffer.from(parts[1], 'hex')
      const encrypted = parts[2]

      const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Generate hash for SSN (for uniqueness checks without exposing data)
   */
  hashSSN(ssn: string): string {
    const hash = crypto.createHash('sha256')
    // Ensure a salt is always appended even if env is empty/undefined
    hash.update(ssn + (process.env.SSN_SALT ?? 'default-salt'))
    return hash.digest('hex')
  }

  /**
   * Generate encryption key (for setup)
   * Run this once and save to ENV
   */
  static generateKey(): string {
    const key = crypto.randomBytes(KEY_LENGTH)
    return key.toString('base64')
  }
}

export const encryptionService = new EncryptionService()

