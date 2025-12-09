/**
 * Database connection and client configuration
 * Uses Drizzle ORM with PostgreSQL (Neon or any PostgreSQL provider)
 */

import fs from 'node:fs'
import path from 'node:path'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return

  const envLocalPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envLocalPath)) return

  const content = fs.readFileSync(envLocalPath, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^DATABASE_URL\s*=\s*(.+)$/)
    if (match) {
      let value = match[1].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env.DATABASE_URL = value
      break
    }
  }
}

// Ensure DATABASE_URL is available both in Next runtime and standalone scripts
ensureDatabaseUrl()

// Environment variables check
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Create the connection
const sql = neon(process.env.DATABASE_URL)

// Create the database instance with schema
export const db = drizzle(sql, { schema })

// Export all schema for easy importing
export * from './schema'
