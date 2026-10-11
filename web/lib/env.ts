import { z } from 'zod';

const schema = z.object({
  API_URL: z.url(),
  JWT_SECRET: z.string().min(16),
  SESSION_COOKIE_NAME: z.string().default('tuloy_session'),
});

export const env = schema.parse({
  API_URL: process.env.API_URL ?? 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET ?? 'kjhsdjkhe2048jf102nsks',
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? 'tuloy_session',
});
