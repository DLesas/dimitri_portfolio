import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';

// ============================================
// COMPANIES
// ============================================
export const companies = pgTable('companies', {
  companyId: uuid('company_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  sector: varchar('sector', { length: 100 }).notNull(),
  ticker: varchar('ticker', { length: 10 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('idx_companies_name').on(table.name),
}));

// ============================================
// TYPES
// ============================================
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
