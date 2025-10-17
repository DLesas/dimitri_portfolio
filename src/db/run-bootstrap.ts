/**
 * Database Bootstrap Runner
 *
 * Handles two modes:
 * 1. 'bootstrap' - Pre-migration: Install pgvector extension
 * 2. 'indexes' - Post-migration: Create specialized indexes
 *
 * Usage:
 *   npm run db:bootstrap        (pre-migration, installs extensions)
 *   npm run db:bootstrap:indexes (post-migration, creates indexes)
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: join(__dirname, '../../.env') });

async function runBootstrap() {
  const mode = process.argv[2] || 'bootstrap';
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  try {
    if (mode === 'bootstrap') {
      // Pre-migration: Install extensions
      console.log('🔧 Running pre-migration bootstrap (extensions)...');

      const bootstrapSql = readFileSync(
        join(__dirname, 'bootstrap.sql'),
        'utf-8'
      );

      const sql = neon(databaseUrl);

      const statements = bootstrapSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement) {
          await sql`${sql.unsafe(statement)}`;
        }
      }

      console.log('✅ Pre-migration bootstrap completed successfully');
      console.log('   - pgvector extension enabled');
      console.log('');
      console.log('Next steps:');
      console.log('   1. Run: npm run db:push');
      console.log('   2. This will create tables and indexes automatically');
    } else if (mode === 'indexes') {
      // Post-migration: Create indexes
      console.log('🔧 Running post-migration bootstrap (indexes)...');

      const bootstrapSql = readFileSync(
        join(__dirname, 'bootstrap-indexes.sql'),
        'utf-8'
      );

      const sql = neon(databaseUrl);

      const statements = bootstrapSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement) {
          await sql`${sql.unsafe(statement)}`;
        }
      }

      console.log('✅ Post-migration bootstrap completed successfully');
      console.log('   - HNSW index created on document_chunks.embedding');
      console.log('   - GIN index created on document_chunks extracted facts columns');
    } else {
      console.error(`❌ Unknown mode: ${mode}`);
      console.error('   Valid modes: bootstrap, indexes');
      process.exit(1);
    }
  } catch (error) {
    if (mode === 'indexes') {
      // Check if error is because tables don't exist yet
      if (error instanceof Error && error.message.includes('does not exist')) {
        console.error('❌ Tables do not exist yet!');
        console.error('   Run migrations first: npm run db:push');
        process.exit(1);
      }

      // Check if error is because pgvector extension is not installed
      if (error instanceof Error && error.message.includes('type "vector" does not exist')) {
        console.error('❌ pgvector extension is not installed!');
        console.error('   Run: npm run db:bootstrap');
        process.exit(1);
      }
    }

    console.error('❌ Error running bootstrap:', error);
    process.exit(1);
  }
}

runBootstrap();
