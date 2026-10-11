import type { Role } from '@tuloy/shared';

/** Only allow same-site paths inside the area this role is allowed to use. */
export function safeNext(
  next: string | null | undefined,
  role: Role,
): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  const area = role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
  return next === area || next.startsWith(`${area}/`) ? next : null;
}
