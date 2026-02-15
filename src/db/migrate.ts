/**
 * Migration helper script
 * Loads .env.local/.env and runs drizzle migrations against DATABASE_URL.
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { neon } from '@neondatabase/serverless'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function loadEnvFile(pathname: string) {
  if (!existsSync(pathname)) return
  const envContent = readFileSync(pathname, 'utf8')
  for (const rawLine of envContent.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx <= 0) continue
    const key = line.slice(0, eqIdx).trim()
    const value = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function resolveDatabaseUrl() {
  // local workspace
  loadEnvFile(join(process.cwd(), '.env.local'))
  loadEnvFile(join(process.cwd(), '.env'))
  // parent workspace (e.g. riviera-ticket/riviera-ticket)
  loadEnvFile(join(process.cwd(), '..', '.env.local'))
  loadEnvFile(join(process.cwd(), '..', '.env'))
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  return databaseUrl
}

const databaseUrl = resolveDatabaseUrl()
const sql = neon(databaseUrl)
const db = drizzle(sql)

export async function runMigrations() {
  const host = (() => {
    try {
      return new URL(databaseUrl).host
    } catch {
      return 'unknown-host'
    }
  })()

  console.log(`Running database migrations on ${host}...`)
  await migrate(db, { migrationsFolder: './src/db/migrations' })
  console.log('Migrations completed successfully')
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}
