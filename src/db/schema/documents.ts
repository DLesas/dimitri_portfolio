import { pgTable, uuid, varchar, text, timestamp, integer, date, index } from 'drizzle-orm/pg-core';
import { companies } from './companies';

// ============================================
// DOCUMENTS
// ============================================
export const documents = pgTable('documents', {
  docId: uuid('doc_id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.companyId, { onDelete: 'cascade' }),

  filename: varchar('filename', { length: 255 }).notNull(),
  documentTitle: varchar('document_title', { length: 500 }),
  documentType: varchar('document_type', { length: 100 }), // Annual Report, Quarterly Report, etc.
  fileType: varchar('file_type', { length: 50 }).notNull(), // pdf, xlsx
  storagePath: text('storage_path').notNull(), // S3 path

  documentDate: date('document_date'), // Date this document refers to (e.g., Q2 2023)
  reportingPeriod: varchar('reporting_period', { length: 50 }), // Q4 2023, FY 2023, etc.

  totalPages: integer('total_pages'),
  totalChunks: integer('total_chunks'),

  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
}, (table) => ({
  companyIdx: index('idx_documents_company').on(table.companyId),
  dateIdx: index('idx_documents_date').on(table.documentDate),
}));

// ============================================
// TYPES
// ============================================
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
