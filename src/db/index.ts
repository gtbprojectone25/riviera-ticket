/**
 * Database connection and client configuration
 * Uses Drizzle ORM with PostgreSQL (Neon or any PostgreSQL provider)
 */

import fs from 'node:fs'
import path from 'node:path'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

type DatabaseUrlSource = 'process.env' | '.env.local' | 'missing'

function ensureDatabaseUrl(): { source: DatabaseUrlSource } {
  if (process.env.DATABASE_URL) return { source: 'process.env' }

  const envLocalPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envLocalPath)) return { source: 'missing' }

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
      return { source: '.env.local' }
    }
  }

  return { source: 'missing' }
}

function getDatabaseLocation(databaseUrl: string): { host?: string; db?: string } {
  try {
    const url = new URL(databaseUrl)
    const host = url.host
    const db = url.pathname.replace(/^\//, '')
    return { host, db }
  } catch {
    return {}
  }
}

// Lazy initialization to avoid throwing during build-time (e.g., Netlify) when env is missing.
// At runtime, the first DB access will validate DATABASE_URL and connect.
type DbInstance = NeonHttpDatabase<typeof schema>

let dbInstance: DbInstance | null = null

function initDb(): DbInstance {
  const { source } = ensureDatabaseUrl()

  if (!process.env.DATABASE_URL) {
    const message = 'DATABASE_URL environment variable is required at runtime. Set it in .env.local or environment variables.'
    if (process.env.NETLIFY === 'true') {
      throw new Error(`${message}. Configure it in Netlify env vars.`)
    }
    throw new Error(message)
  }

  if (process.env.NODE_ENV !== 'production') {
    const { host, db } = getDatabaseLocation(process.env.DATABASE_URL)
    const location = host && db ? `host=${host} db=${db}` : 'host/db unavailable'
    console.log(`[DB] DATABASE_URL source=${source} ${location}`)
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
