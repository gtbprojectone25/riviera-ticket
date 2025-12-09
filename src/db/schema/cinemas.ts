import {
  pgTable,
  text,
  boolean,
  doublePrecision,
  timestamp,
} from 'drizzle-orm/pg-core'

export const cinemas = pgTable('cinemas', {
  id: text('id').primaryKey(), // ex: "amc-lincoln-square"

  name: text('name').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  country: text('country').notNull(),

  isIMAX: boolean('is_imax').notNull(),

  format: text('format'),

  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),

  address: text('address'),
  zipCode: text('zip_code'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

