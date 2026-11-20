import { z } from 'zod';
import { apiClient } from '../api/client';
import { roleSchema, type LoginInput } from '../auth/shared';
import { SESSION_COOKIE } from '../auth/constants';

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  role: roleSchema,
  businessId: z.string().nullable().optional(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
  owner: authUserSchema.optional(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const authApi = {
  async login(credentials: LoginInput): Promise<AuthResponse> {
    const data = await apiClient.post(
      '/auth/login',
      authResponseSchema,
      credentials,
    );
    if (typeof document !== 'undefined') {
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(
        data.accessToken,
      )}; path=/; max-age=604800; SameSite=Lax${secure}`;
    }
    return data;
  },

  // Server logout only logs the event, so the cookie is cleared even if it fails.
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout', z.unknown()).catch(() => null);
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  },

  async me(): Promise<AuthUser> {
    return apiClient.get('/auth/me', authUserSchema);
  },
};