import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Create the Neon HTTP client
// This is optimized for serverless/edge environments and Next.js
const sql = neon(process.env.DATABASE_URL!);

// Initialize Drizzle with the schema for type-safe queries
export const db = drizzle({ client: sql, schema });

// Export schema for convenience
export * from './schema';
