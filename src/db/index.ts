/**
 * Database connection and client configuration
 * Uses Drizzle ORM with PostgreSQL (Neon or any PostgreSQL provider)
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

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