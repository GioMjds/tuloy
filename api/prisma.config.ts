import { defineConfig, env } from '@prisma/config';

// Vercel builds have no .env file, so a missing file is not an error.
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    // Migrations need Neon's direct connection; the app runtime uses pooled DATABASE_URL.
    url: process.env.DATABASE_URL_UNPOOLED ?? env('DATABASE_URL'),
  },
  migrations: {
    seed: 'node --experimental-strip-types prisma/seed.ts',
  },
});
