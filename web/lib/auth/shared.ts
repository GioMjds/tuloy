import { z } from 'zod';

export const roleSchema = z.enum(['OWNER', 'BUSINESS_OWNER', 'SUPER_ADMIN']);
export type Role = z.infer<typeof roleSchema>;

// Error messages are i18n keys, resolved in the UI.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('validation.email'),
  password: z.string().min(1, 'validation.required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  businessId: string | null;
};
