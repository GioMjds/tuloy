import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE, homeFor } from '@/lib/auth/constants';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifyToken(token) : null;

  // Already signed in → skip the login page
  if (pathname === '/login') {
    return user
      ? NextResponse.redirect(new URL(homeFor(user.role), req.url))
      : NextResponse.next();
  }

  // Not signed in (or expired/invalid token) → login, remember where they were going
  if (!user) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  // Wrong area for this role → send them home
  if (pathname.startsWith('/admin') && user.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL(homeFor(user.role), req.url));
  }
  if (
    pathname.startsWith('/dashboard') &&
    user.role !== 'BUSINESS_OWNER' &&
    user.role !== 'OWNER'
  ) {
    return NextResponse.redirect(new URL(homeFor(user.role), req.url));
  }

  return NextResponse.next();
}

// Public customer routes never run through this.
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
};
