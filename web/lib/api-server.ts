import 'server-only';
import { cookies } from 'next/headers';
import type { z } from 'zod';
import { env } from './env';
import { SESSION_COOKIE } from './auth/constants';
import { ApiError, parseErrorCode } from './api-error';

type ServerOpts<T> = {
  schema?: z.ZodType<T>;
  auth?: boolean; // attach owner JWT; implies no-store
  revalidate?: number; // data-cache TTL for public reads
};

export async function serverFetch<T>(
  path: string,
  { schema, auth = false, revalidate = 60 }: ServerOpts<T> = {},
): Promise<T> {
  const headers = new Headers();
  if (auth) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) headers.set('authorization', `Bearer ${token}`);
  }

  const res = await fetch(
    `${env.API_URL}${path}`,
    auth ? { headers, cache: 'no-store' } : { headers, next: { revalidate } },
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, parseErrorCode(data), data);
  }
  const json = await res.json();
  return schema ? schema.parse(json) : (json as T);
}
