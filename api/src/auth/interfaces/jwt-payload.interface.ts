import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  businessId?: string | null;
  // iat / exp are added by @nestjs/jwt automatically
}