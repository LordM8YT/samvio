import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'mysql',
  schema: './src/lib/server/db/schema.ts',
  out: '../database/drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' }
});
