/**
 * Migration helper script
 * Provides utilities for database migration management
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const sql = neon(process.env.DATABASE_URL)
const db = drizzle(sql)

export async function runMigrations() {
  console.log('🔄 Running database migrations...')
  
  try {
    await migrate(db, { 
      migrationsFolder: './src/db/migrations' 
    })
    console.log('✅ Migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🎉 Database is ready!')
      process.exit(0)
    })
    .catch(() => process.exit(1))
}