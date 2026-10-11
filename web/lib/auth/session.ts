import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Role, SessionUser } from '@tuloy/shared';
import { SESSION_COOKIE, homeFor } from './constants';
import { verifyToken } from './jwt';

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const v = await verifyToken(token);
  if (!v) return null;
  const { exp: _exp, ...user } = v;
  return user;
});

export async function requireSession(role: Role): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect('/login');
  const isOwnerMatch =
    (role === 'OWNER' || role === 'BUSINESS_OWNER') &&
    (user.role === 'OWNER' || user.role === 'BUSINESS_OWNER');
  if (user.role !== role && !isOwnerMatch) redirect(homeFor(user.role));
  return user;
}
