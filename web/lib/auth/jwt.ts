import { jwtVerify } from 'jose';
import { z } from 'zod';
import { roleSchema, type SessionUser } from '@tuloy/shared';

const payloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  role: roleSchema,
  businessId: z.string().nullable().optional(),
  exp: z.number(),
});

export type VerifiedSession = SessionUser & { exp: number };

export async function verifyToken(
  token: string,
): Promise<VerifiedSession | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    const p = payloadSchema.parse(payload);
    return {
      id: p.sub,
      email: p.email,
      role: p.role,
      businessId: p.businessId ?? null,
      exp: p.exp,
    };
  } catch {
    return null; // expired, tampered, or wrong shape
  }
}
