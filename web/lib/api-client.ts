import type { z } from 'zod';
import { ApiError, parseErrorCode } from './api-error';
import { redirect } from 'next/navigation';

type ApiOptions<T> = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
};

const isProtectedPath = (p: string) =>
  p.startsWith('/dashboard') || p.startsWith('/admin');

export async function apiFetch<T>(
  path: string,
  opts: ApiOptions<T> = {},
): Promise<T> {
  const { method = 'GET', body, schema, signal } = opts;

  const res = await fetch(`/api/proxy${path}`, {
    method,
    signal,
    cache: 'no-store',
    headers:
      body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 401 && isProtectedPath(window.location.pathname)) {
      redirect(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
    throw new ApiError(res.status, parseErrorCode(data), data);
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return schema ? schema.parse(json) : (json as T);
}
