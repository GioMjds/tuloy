import z from 'zod';
import { roleSchema } from '../auth/shared';

export const authUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().nullable().optional(),
  role: roleSchema,
  businessId: z.string().nullable().optional(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
  token: z.string(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
