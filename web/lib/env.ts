import { z } from 'zod';

const schema = z.object({
  API_URL: z.url(),
  JWT_SECRET: z.string().min(16),
});

export const env = schema.parse({
  API_URL: process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL,
  JWT_SECRET: process.env.JWT_SECRET ?? 'kjhsdjkhe2048jf102nsks',
});
