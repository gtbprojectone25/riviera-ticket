/**
 * Database connection and client configuration
 * Uses Drizzle ORM with PostgreSQL (Neon or any PostgreSQL provider)
 */

import fs from 'node:fs'
import path from 'node:path'
import { drizzle, type NeonHTTPDatabase } from 'drizzle-orm/neon-http'
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

// Lazy initialization to avoid throwing during build-time (e.g., Netlify) when env is missing.
// At runtime, the first DB access will validate DATABASE_URL and connect.
type DbInstance = NeonHTTPDatabase<typeof schema>

let dbInstance: DbInstance | null = null

function initDb(): DbInstance {
  ensureDatabaseUrl()

  if (!process.env.DATABASE_URL) {
    const message = 'DATABASE_URL environment variable is required at runtime'
    if (process.env.NETLIFY === 'true') {
      throw new Error(`${message}. Configure it in Netlify env vars.`)
    }
    throw new Error(message)
  }

  const sql = neon(process.env.DATABASE_URL)
  return drizzle(sql, { schema })
}

export function getDb(): DbInstance {
  if (!dbInstance) {
    dbInstance = initDb()
  }
  return dbInstance
}

// Proxy delays the real initialization until a property is accessed
export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      const instance = getDb()
      // @ts-expect-error passthrough proxy
      return instance[prop]
    },
  },
) as DbInstance

// Export all schema for easy importing
export * from './schema'
