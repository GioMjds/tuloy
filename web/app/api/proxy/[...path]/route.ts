import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { SESSION_COOKIE } from '@/lib/auth/constants';

const ALLOWED = new Set(['businesses', 'queue', 'appointments', 'owners', 'admin']);

async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  if (!ALLOWED.has(path[0])) {
    return NextResponse.json({ message: 'not_found' }, { status: 404 });
  }

  const url = new URL(`${env.API_URL}/${path.join('/')}`);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  const ct = req.headers.get('content-type');
  if (ct) headers.set('content-type', ct);

  const xff = req.headers.get('x-forwarded-for');
  if (xff) headers.set('x-forwarded-for', xff);

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) headers.set('authorization', `Bearer ${token}`);

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body:
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : await req.text(),
    cache: 'no-store',
  });

  const res = new NextResponse(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: {
      'content-type':
        upstream.headers.get('content-type') ?? 'application/json',
    },
  });
  if (upstream.status === 401) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
};
