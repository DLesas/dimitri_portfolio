-- ============================================
-- POST-MIGRATION BOOTSTRAP (INDEXES ONLY)
-- ============================================
-- Run this AFTER migrations
-- Creates specialized indexes on existing tables
-- Safe to run multiple times (idempotent)
-- ============================================

-- ============================================
-- VECTOR SIMILARITY INDEX
-- ============================================
-- HNSW index for fast cosine similarity search on embeddings
-- This provides nearest-neighbor search for RAG retrieval

CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- JSONB INDEXES FOR CATEGORIZED INFORMATION
-- ============================================
-- GIN indexes for querying categorized JSONB columns (TB, PAQL, PAQN)

CREATE INDEX IF NOT EXISTS idx_chunks_time_based_gin
  ON document_chunks
  USING gin (time_based_info);

CREATE INDEX IF NOT EXISTS idx_chunks_qualitative_gin
  ON document_chunks
  USING gin (qualitative_info);

CREATE INDEX IF NOT EXISTS idx_chunks_quantitative_gin
  ON document_chunks
  USING gin (quantitative_data);

-- ============================================
-- EXISTING INDEXES (from Drizzle schema)
-- ============================================
-- These are automatically created by Drizzle migrations:
-- - idx_companies_name (on companies.name)
-- - idx_documents_company (on documents.company_id)
-- - idx_documents_date (on documents.document_date)
-- - idx_chunks_doc (on document_chunks.doc_id)
-- - idx_chunks_doc_index (on document_chunks.doc_id, chunk_index)
--
-- Do not recreate these here.
