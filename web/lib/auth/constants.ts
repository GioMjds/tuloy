// Fixed name because browser code cannot read non-NEXT_PUBLIC env vars.
export const SESSION_COOKIE = 'tuloy_session';

export const homeFor = (role: 'OWNER' | 'BUSINESS_OWNER' | 'SUPER_ADMIN') =>
  role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
