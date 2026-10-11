export const SESSION_COOKIE =
  process.env.SESSION_COOKIE_NAME ?? 'access_token';

export const homeFor = (role: 'OWNER' | 'BUSINESS_OWNER' | 'SUPER_ADMIN') =>
  role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
