import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { loginSchema } from '@tuloy/shared';
import { env } from '@/lib/env';
import { verifyToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE, homeFor } from '@/lib/auth/constants';

export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'invalid_input' }, { status: 400 });
  }

  const upstream = await fetch(`${env.API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
  }).catch(() => null);

  if (!upstream)
    return NextResponse.json({ message: 'login_failed' }, { status: 502 });
  if (upstream.status === 401) {
    return NextResponse.json(
      { message: 'invalid_credentials' },
      { status: 401 },
    );
  }
  if (!upstream.ok)
    return NextResponse.json({ message: 'login_failed' }, { status: 502 });

  const { accessToken } = (await upstream.json()) as { accessToken: string };
  const user = await verifyToken(accessToken);
  if (!user)
    return NextResponse.json({ message: 'login_failed' }, { status: 502 });

  (await cookies()).set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(user.exp * 1000),
  });

  const { exp: _exp, ...publicUser } = user;
  return NextResponse.json({
    user: publicUser,
    redirectTo: homeFor(user.role),
  });
}
