import { z } from 'zod';

const schema = z.object({
  API_URL: z.url(),
  JWT_SECRET: z.string().min(16),
});

export const env = schema.parse({
  // API_URL is the Vercel service binding; it is unset at build time, so fall back.
  API_URL:
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET ?? 'kjhsdjkhe2048jf102nsks',
});
