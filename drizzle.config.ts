import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Database dialect
  dialect: 'postgresql',

  // Schema files location
  schema: './src/db/schema',

  // Migration files output directory
  out: './drizzle/migrations',

  // Database credentials
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  // Enable verbose logging for migrations
  verbose: true,

  // Enable strict mode
  strict: true,
});
