import 'server-only';

import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '../auth/constants';

export async function serverFetch(path: string, options: RequestInit = {}) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const headers = new Headers(options.headers);

  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers,
  });
}
