import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  businessId?: string | null;
}

// Backward-compatible alias
export type AuthenticatedOwner = AuthenticatedUser;