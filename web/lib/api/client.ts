import { createValidatedClient } from './validated-client';
import { SESSION_COOKIE } from '../auth/constants';
import { redirect } from 'next/navigation';

function getClientCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

export const apiClient = createValidatedClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  getToken: () => getClientCookie(SESSION_COOKIE),
  onUnauthorized: () => {
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/dashboard') ||
        window.location.pathname.startsWith('/admin'))
    ) {
      redirect(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
  },
});
