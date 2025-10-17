import { pgTable, uuid, integer, text, varchar, jsonb, timestamp, index, vector } from 'drizzle-orm/pg-core';
import { documents } from './documents';
import type { TimeBasedInfo, QualitativeInfo, QuantitativeData } from '@/app/Felix/lib/ai/schemas';

// ============================================
// DOCUMENT CHUNKS
// ============================================
export const documentChunks = pgTable('document_chunks', {
  chunkId: uuid('chunk_id').primaryKey().defaultRandom(),
  docId: uuid('doc_id').notNull().references(() => documents.docId, { onDelete: 'cascade' }),

  chunkIndex: integer('chunk_index').notNull(), // 1, 2, 3...
  chunkText: text('chunk_text').notNull(),

  // Section info
  pageStart: integer('page_start'),
  pageEnd: integer('page_end'),
  sectionTitle: varchar('section_title', { length: 500 }),
  tokenCount: integer('token_count'),

  // Vector embedding (1536 dimensions for OpenAI text-embedding-3-small)
  embedding: vector('embedding', { dimensions: 1536 }),

  // Time-Based (TB) Information - future events, timelines, expected dates
  timeBasedInfo: jsonb('time_based_info').$type<TimeBasedInfo[]>().default([]),
  /* Example:
  [
    {
      "category": "TB",
      "text": "Company is expected to hold a product launch on Q4 2024",
      "eventType": "product_launch",
      "expectedDate": "Q4 2024",
      "description": "New AI product suite launch",
    }
  ]
  */

  // Primary Asset Qualitative (PAQL) Information - business operations, expansions, engagements
  qualitativeInfo: jsonb('qualitative_info').$type<QualitativeInfo[]>().default([]),
  /* Example:
  [
    {
      "category": "PAQL",
      "text": "Recently expanded to 3 new locations in Southeast Asia",
      "topic": "expansion",
      "context": "Geographic expansion into emerging markets",
      "sentiment": "positive",
    }
  ]
  */

  // Primary Asset Quantitative (PAQN) Information - financial metrics, revenue, KPIs
  quantitativeData: jsonb('quantitative_data').$type<QuantitativeData[]>().default([]),
  /* Example:
  [
    {
      "category": "PAQN",
      "metricName": "rental_revenue",
      "value": 90000000,
      "unit": "EUR",
      "period": "Q4 2023",
    }
  ]
  */

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  docIdx: index('idx_chunks_doc').on(table.docId),
  docIndexIdx: index('idx_chunks_doc_index').on(table.docId, table.chunkIndex),
}));

// ============================================
// TYPES
// ============================================
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
