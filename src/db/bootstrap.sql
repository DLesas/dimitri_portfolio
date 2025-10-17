-- ============================================
-- PRE-MIGRATION BOOTSTRAP (EXTENSIONS ONLY)
-- ============================================
-- Run this BEFORE migrations in your Neon SQL Editor
-- Requires elevated privileges
-- Safe to run multiple times (idempotent)
-- ============================================

-- Enable pgvector extension for 1536-dimensional embeddings
CREATE EXTENSION IF NOT EXISTS vector;
