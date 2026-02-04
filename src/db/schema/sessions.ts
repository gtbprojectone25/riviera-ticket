// LEGACY SCHEMA (deprecated)
// Use '@/db/schema' as the single source of truth. Do not import from this file.

import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  movieTitle: varchar('movie_title', { length: 255 }).notNull(),
  startsAt: timestamp('starts_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})


