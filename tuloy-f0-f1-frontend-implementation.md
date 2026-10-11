# Tuloy Frontend: F0 (Foundation) + F1 (Auth) Scaffold

**Locked decisions**

- Auth: **Option B**. Next route handlers act as a BFF and set an **httpOnly cookie**. Middleware reads it. The browser never sees the JWT.
- Server state: TanStack Query. Zustand only for session (per-request), persisted UI prefs, and socket status.
- i18n: next-intl, **cookie-based locale, no URL prefix**.
- Dark mode is **cut from v0** (no theme provider). Revisit in F6 if wanted.

**Assumptions about your backend. Verify these before running anything**

| #   | Assumption                                                                                      | If wrong                                                                           |
| --- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `POST /auth/login` returns `{ accessToken: string }`                                            | Adjust the login route handler                                                     |
| 2   | JWT payload has `sub`, `email`, `role`, `businessId`, `exp`, signed **HS256** with `JWT_SECRET` | Adjust `payloadSchema` in `jwt.ts`; for RS256 use `importSPKI` with the public key |
| 3   | Role values are `BUSINESS_OWNER` and `SUPER_ADMIN`                                              | Change `roleSchema` in shared                                                      |
| 4   | Package name is `@tuloy/shared`, alias `@/*` → `apps/web/src/*`                                 | Rename imports                                                                     |
| 5   | Next.js 15 or 16, App Router, React 19                                                          | `cookies()` and `params` are async in 15+ (code below assumes this)                |

If `packages/shared` already exports login or role schemas, import those instead of adding the ones below.

---

## 1. Install

```bash
cd apps/web
pnpm add @tanstack/react-query zustand zod react-hook-form @hookform/resolvers \
  next-intl jose sonner lucide-react server-only
pnpm add @tuloy/shared --workspace

pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label form card badge separator \
  skeleton sonner sidebar dropdown-menu avatar
```

`sidebar` pulls in `sheet`, `tooltip` and `use-mobile` automatically. shadcn's `sonner` imports `next-themes`, which is harmless without a ThemeProvider.

`.env.local.example`:

```bash
API_URL=http://localhost:4000          # NestJS base URL (server-side only)
JWT_SECRET=change-me-same-as-nest      # must match NestJS signing secret
SESSION_COOKIE_NAME=tuloy_session
NEXT_PUBLIC_WS_URL=http://localhost:4000   # used from F2
```

`next.config.ts`:

```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  transpilePackages: ['@tuloy/shared'], // shared package ships TS source
  async headers() {
    return [
      {
        // F3: ticket URLs carry a bearer token
        source: '/t/:token*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default withNextIntl(config);
```

---

## 2. File tree (new files only)

```text
packages/shared/src/
  auth.ts                              roleSchema, loginSchema, SessionUser
  index.ts                             export * from './auth'

apps/web/
  messages/{en,fil}.json
  middleware.ts                        (proxy.ts in Next 16, see §4.6)
  src/
    app/
      layout.tsx
      error.tsx
      not-found.tsx
      (public)/layout.tsx
      (public)/page.tsx
      (public)/b/[slug]/page.tsx       stub: proves serverFetch + PublicShell
      (auth)/layout.tsx
      (auth)/login/page.tsx
      (owner)/dashboard/layout.tsx
      (owner)/dashboard/page.tsx       stub
      (admin)/admin/layout.tsx
      (admin)/admin/page.tsx           stub
      api/auth/login/route.ts
      api/auth/logout/route.ts
      api/proxy/[...path]/route.ts
    components/
      layout/
        public-shell.tsx
        auth-shell.tsx
        dashboard-shell.tsx
        app-sidebar.tsx
        bottom-nav.tsx
        user-menu.tsx
        page-header.tsx
        connection-status.tsx
        locale-switcher.tsx
        states.tsx                     EmptyState, ErrorState, PageSkeleton
      forms/form-message-t.tsx
    config/nav.ts
    features/auth/login-form.tsx
    i18n/request.ts
    i18n/actions.ts
    lib/
      env.ts
      api-error.ts
      api-client.ts                    client-side (via proxy)
      api-server.ts                    server-side (direct to Nest)
      auth/constants.ts
      auth/jwt.ts                      edge-safe verify
      auth/session.ts                  server helpers
      auth/redirect.ts                 safeNext + tests
    providers/query-provider.tsx
    stores/session-store.tsx
    stores/ui-store.ts
    stores/realtime-store.ts
```

---

## 3. F0: Foundation

### 3.1 Shared schemas

`packages/shared/src/auth.ts`

```ts
import { z } from 'zod';

export const roleSchema = z.enum(['BUSINESS_OWNER', 'SUPER_ADMIN']);
export type Role = z.infer<typeof roleSchema>;

// Error messages are i18n keys, resolved in the UI.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('validation.email'),
  password: z.string().min(1, 'validation.required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  businessId: string | null;
};
```

### 3.2 Env, constants, errors

`src/lib/env.ts` (server-side only; do not import from client components)

```ts
import { z } from 'zod';

const schema = z.object({
  API_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  SESSION_COOKIE_NAME: z.string().default('tuloy_session'),
});

export const env = schema.parse(process.env);
```

`src/lib/auth/constants.ts` (imported by middleware, so no zod parse here)

```ts
export const SESSION_COOKIE =
  process.env.SESSION_COOKIE_NAME ?? 'tuloy_session';
export const homeFor = (role: 'BUSINESS_OWNER' | 'SUPER_ADMIN') =>
  role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
```

`src/lib/api-error.ts`

```ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(code);
  }
}

// Nest returns { statusCode, message, error }; message may be string | string[]
export const parseErrorCode = (body: unknown): string => {
  const m = (body as { message?: unknown } | null)?.message;
  return typeof m === 'string' ? m : 'request_failed';
};
```

### 3.3 API clients

**Client-side** (browser → Next proxy → Nest). `src/lib/api-client.ts`

```ts
import type { z } from 'zod';
import { ApiError, parseErrorCode } from './api-error';

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
    // Proxy already cleared the cookie on 401; hard-navigate to reset client state.
    if (res.status === 401 && isProtectedPath(window.location.pathname)) {
      window.location.assign(
        `/login?next=${encodeURIComponent(window.location.pathname)}`,
      );
    }
    throw new ApiError(res.status, parseErrorCode(data), data);
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return schema ? schema.parse(json) : (json as T);
}
```

**Server-side** (RSC → Nest directly). `src/lib/api-server.ts`

```ts
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
```

> **Why cache at the fetch level, not the page level.** The cookie-based locale reads `cookies()` on every request, which makes pages dynamic, so page-level ISR on `/b/[slug]` is off the table. `next: { revalidate }` on the fetch still caches the shop data. This corrects the "revalidate: 60 on the page" idea in the earlier plan.

### 3.4 Route handlers (BFF)

`src/app/api/auth/login/route.ts`

```ts
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
    expires: new Date(user.exp * 1000), // cookie lives exactly as long as the JWT
  });

  const { exp: _exp, ...publicUser } = user;
  return NextResponse.json({
    user: publicUser,
    redirectTo: homeFor(user.role),
  });
}
```

`src/app/api/auth/logout/route.ts`

```ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/constants';

export async function POST() {
  (await cookies()).delete(SESSION_COOKIE);
  return new NextResponse(null, { status: 204 });
}
```

`src/app/api/proxy/[...path]/route.ts`

```ts
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { SESSION_COOKIE } from '@/lib/auth/constants';

// Adjust to your Nest controllers. `auth/*` is deliberately excluded
// (login/logout have dedicated handlers).
const ALLOWED = new Set(['businesses', 'queue', 'appointments', 'owners']);

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

  // Forward the real client IP so Nest's per-IP rate limit isn't keyed to Vercel.
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
```

### 3.5 i18n (cookie-based)

`src/i18n/request.ts`

```ts
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['en', 'fil'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en'; // your call: 'fil' may fit walk-in customers better
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export default getRequestConfig(async () => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = (locales as readonly string[]).includes(c ?? '')
    ? (c as Locale)
    : defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

`src/i18n/actions.ts`

```ts
'use server';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, locales, type Locale } from './request';

export async function setLocale(locale: Locale) {
  if (!locales.includes(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
```

`messages/en.json` (Filipino draft below; please review the wording)

```json
{
  "common": {
    "appName": "Tuloy",
    "poweredBy": "Powered by Tuloy",
    "signOut": "Sign out",
    "retry": "Try again"
  },
  "nav": {
    "queue": "Queue",
    "services": "Services",
    "share": "Share",
    "settings": "Settings",
    "shops": "Shops",
    "owners": "Owners"
  },
  "auth": {
    "loginTitle": "Sign in",
    "loginDescription": "Manage your queue.",
    "email": "Email",
    "password": "Password",
    "submit": "Sign in",
    "submitting": "Signing in…",
    "invalid_credentials": "Wrong email or password.",
    "login_failed": "Can't sign in right now. Please try again.",
    "invalid_input": "Please check your details."
  },
  "validation": {
    "required": "This field is required.",
    "email": "Enter a valid email."
  },
  "realtime": {
    "live": "Live",
    "connecting": "Connecting…",
    "offline": "Offline"
  },
  "states": {
    "emptyTitle": "Nothing here yet",
    "errorTitle": "Something went wrong",
    "notFoundTitle": "Page not found",
    "shopNotFound": "Shop not found"
  },
  "dashboard": { "queueEmpty": "No one in the queue yet." },
  "admin": { "shopsEmpty": "No shops yet." }
}
```

`messages/fil.json`

```json
{
  "common": {
    "appName": "Tuloy",
    "poweredBy": "Powered by Tuloy",
    "signOut": "Mag-log out",
    "retry": "Subukan ulit"
  },
  "nav": {
    "queue": "Pila",
    "services": "Mga Serbisyo",
    "share": "I-share",
    "settings": "Mga Setting",
    "shops": "Mga Tindahan",
    "owners": "Mga May-ari"
  },
  "auth": {
    "loginTitle": "Mag-login",
    "loginDescription": "Pamahalaan ang inyong pila.",
    "email": "Email",
    "password": "Password",
    "submit": "Mag-login",
    "submitting": "Nagla-login…",
    "invalid_credentials": "Mali ang email o password.",
    "login_failed": "Hindi makapag-login ngayon. Subukan ulit.",
    "invalid_input": "Pakisuri ang inyong mga detalye."
  },
  "validation": {
    "required": "Kailangan ito.",
    "email": "Maglagay ng tamang email."
  },
  "realtime": {
    "live": "Live",
    "connecting": "Kumokonekta…",
    "offline": "Offline"
  },
  "states": {
    "emptyTitle": "Wala pa rito",
    "errorTitle": "Nagkaproblema",
    "notFoundTitle": "Hindi nahanap ang page",
    "shopNotFound": "Hindi nahanap ang tindahan"
  },
  "dashboard": { "queueEmpty": "Wala pang nakapila." },
  "admin": { "shopsEmpty": "Wala pang tindahan." }
}
```

### 3.6 Providers and stores

`src/providers/query-provider.tsx` (the persister is added in F3 for offline tickets)

```tsx
'use client';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-error';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            refetchOnWindowFocus: true,
            // Don't retry 4xx; they won't fix themselves
            retry: (count, err) =>
              !(
                err instanceof ApiError &&
                err.status >= 400 &&
                err.status < 500
              ) && count < 2,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

`src/stores/session-store.tsx`. **Per-request store**, because it's seeded with user data and must never leak across SSR requests.

```tsx
'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type { SessionUser } from '@tuloy/shared';

type SessionState = { user: SessionUser | null; clear: () => void };
const SessionContext = createContext<StoreApi<SessionState> | null>(null);

export function SessionProvider({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null;
  children: ReactNode;
}) {
  const [store] = useState(() =>
    createStore<SessionState>((set) => ({
      user: initialUser,
      clear: () => set({ user: null }),
    })),
  );
  return (
    <SessionContext.Provider value={store}>{children}</SessionContext.Provider>
  );
}

export function useSession<T>(selector: (s: SessionState) => T): T {
  const store = useContext(SessionContext);
  if (!store)
    throw new Error('useSession must be used inside <SessionProvider>');
  return useStore(store, selector);
}
```

`src/stores/ui-store.ts`. Module-level is fine here: client-only, persisted, never written during SSR.

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UiState = { soundEnabled: boolean; setSoundEnabled: (v: boolean) => void };

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
    }),
    { name: 'tuloy-ui', skipHydration: true }, // rehydrate in an effect to avoid mismatch
  ),
);
```

Call `useUiStore.persist.rehydrate()` once in a client effect inside `DashboardShell` (see §3.8).

`src/stores/realtime-store.ts` (stub; the socket hook writes to it in F2)

```ts
import { create } from 'zustand';

export type RealtimeStatus = 'idle' | 'connecting' | 'live' | 'offline';
type RealtimeState = {
  status: RealtimeStatus;
  setStatus: (s: RealtimeStatus) => void;
};

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));
```

### 3.7 Root layout and global states

`src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tuloy',
  description: 'Queue and booking for local shops',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html lang={locale}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>{children}</QueryProvider>
          <Toaster richColors position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

> **Do not call `getSession()` in the root layout.** It would add a second dynamic-rendering trigger and put session logic on every public page. `SessionProvider` lives only in the `(owner)` and `(admin)` layouts.

`src/app/error.tsx` and `not-found.tsx`

```tsx
// error.tsx
'use client';
import { useTranslations } from 'next-intl';
import { ErrorState } from '@/components/layout/states';

export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = useTranslations();
  return (
    <ErrorState
      title={t('states.errorTitle')}
      actionLabel={t('common.retry')}
      onAction={reset}
    />
  );
}
```

```tsx
// not-found.tsx
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/layout/states';

export default async function NotFound() {
  const t = await getTranslations('states');
  return <EmptyState title={t('notFoundTitle')} />;
}
```

### 3.8 Layout components

`src/components/layout/states.tsx`

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="font-medium">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function ErrorState({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-medium">{title}</p>
      {onAction && (
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
```

`src/components/layout/page-header.tsx`

```tsx
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}
```

`src/components/layout/connection-status.tsx`

```tsx
'use client';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { useRealtimeStore } from '@/stores/realtime-store';

const dot = {
  live: 'bg-green-500',
  connecting: 'bg-amber-500',
  offline: 'bg-red-500',
} as const;

export function ConnectionStatus() {
  const t = useTranslations('realtime');
  const status = useRealtimeStore((s) => s.status);
  if (status === 'idle') return null;
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className={`size-2 rounded-full ${dot[status]}`} />
      {t(status)}
    </Badge>
  );
}
```

`src/components/layout/locale-switcher.tsx`

```tsx
'use client';
import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { setLocale } from '@/i18n/actions';
import type { Locale } from '@/i18n/request';

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, start] = useTransition();
  const next: Locale = locale === 'en' ? 'fil' : 'en';

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Switch language to ${next === 'fil' ? 'Filipino' : 'English'}`}
      onClick={() =>
        start(async () => {
          await setLocale(next);
          router.refresh();
        })
      }
    >
      {locale === 'en' ? 'EN' : 'FIL'}
    </Button>
  );
}
```

`src/components/layout/public-shell.tsx`

```tsx
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from './locale-switcher';

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common');
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex h-12 items-center justify-between px-4">
        <span className="font-semibold">{t('appName')}</span>
        <LocaleSwitcher />
      </header>
      <main className="flex-1 px-4 pb-8">{children}</main>
      <footer className="py-4 text-center text-xs text-muted-foreground">
        {t('poweredBy')}
      </footer>
    </div>
  );
}
```

`src/components/layout/auth-shell.tsx`

```tsx
import { LocaleSwitcher } from './locale-switcher';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="absolute right-3 top-3">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
```

`src/config/nav.ts`

```ts
import {
  ListOrdered,
  Package,
  QrCode,
  Settings,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = { href: string; labelKey: string; icon: LucideIcon };

export const navByVariant: Record<'owner' | 'admin', NavItem[]> = {
  owner: [
    { href: '/dashboard', labelKey: 'nav.queue', icon: ListOrdered },
    { href: '/dashboard/services', labelKey: 'nav.services', icon: Package },
    { href: '/dashboard/share', labelKey: 'nav.share', icon: QrCode },
    { href: '/dashboard/settings', labelKey: 'nav.settings', icon: Settings },
    // Phase 6: { href: '/dashboard/appointments', ... }
  ],
  admin: [
    { href: '/admin', labelKey: 'nav.shops', icon: Store },
    { href: '/admin/owners', labelKey: 'nav.owners', icon: Users },
  ],
};

// Roots must match exactly; deeper routes match by prefix.
export const isActive = (pathname: string, href: string) =>
  href === '/dashboard' || href === '/admin'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
```

> **Server → client gotcha.** Icons are component functions and cannot be passed as props from a server component to a client component. That is why shells take `variant: 'owner' | 'admin'` and the client components import `navByVariant` themselves.

`src/components/layout/app-sidebar.tsx`

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { isActive, navByVariant } from '@/config/nav';

export function AppSidebar({ variant }: { variant: 'owner' | 'admin' }) {
  const t = useTranslations();
  const pathname = usePathname();
  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3 font-semibold">
        {t('common.appName')}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navByVariant[variant].map(({ href, labelKey, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild isActive={isActive(pathname, href)}>
                  <Link href={href}>
                    <Icon /> {t(labelKey)}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
```

`src/components/layout/bottom-nav.tsx` (mobile only, 44px+ touch targets)

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { isActive, navByVariant } from '@/config/nav';

export function BottomNav({ variant }: { variant: 'owner' | 'admin' }) {
  const t = useTranslations();
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="flex">
        {navByVariant[variant].map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? 'font-medium text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="size-5" />
                {t(labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

`src/components/layout/user-menu.tsx`

```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from '@/stores/session-store';

export function UserMenu() {
  const t = useTranslations('common');
  const router = useRouter();
  const user = useSession((s) => s.user);
  const clear = useSession((s) => s.clear);
  if (!user) return null;

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    clear();
    router.replace('/login');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={user.email}>
        <Avatar className="size-8">
          <AvatarFallback>
            {user.email.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-56 truncate">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut /> {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

`src/components/layout/dashboard-shell.tsx`

```tsx
'use client';
import { useEffect, type ReactNode } from 'react';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { BottomNav } from './bottom-nav';
import { ConnectionStatus } from './connection-status';
import { LocaleSwitcher } from './locale-switcher';
import { UserMenu } from './user-menu';
import { useUiStore } from '@/stores/ui-store';

export function DashboardShell({
  variant,
  children,
}: {
  variant: 'owner' | 'admin';
  children: ReactNode;
}) {
  useEffect(() => {
    useUiStore.persist.rehydrate();
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar variant={variant} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger className="hidden md:inline-flex" />
          <div className="ml-auto flex items-center gap-2">
            <ConnectionStatus />
            <LocaleSwitcher />
            <UserMenu />
          </div>
        </header>
        {/* pb-24 leaves room for the fixed bottom nav on mobile */}
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
        <BottomNav variant={variant} />
      </SidebarInset>
    </SidebarProvider>
  );
}
```

On mobile, shadcn's `Sidebar` renders as a sheet that is never opened because there is no trigger. Mobile navigation is the bottom bar.

### 3.9 Route group layouts and stub pages

`src/app/(public)/layout.tsx`

```tsx
import { PublicShell } from '@/components/layout/public-shell';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
```

`src/app/(public)/page.tsx`

```tsx
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';

export default async function Home() {
  const t = await getTranslations('common');
  return <PageHeader title={t('appName')} />;
}
```

`src/app/(public)/b/[slug]/page.tsx`. Stub that exercises `serverFetch` and the not-found path.

```tsx
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/page-header';
import { serverFetch } from '@/lib/api-server';
import { ApiError } from '@/lib/api-error';

// Minimal on purpose; replace with the real business schema in F3.
const businessSchema = z
  .object({ name: z.string(), slug: z.string() })
  .passthrough();

export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await serverFetch(`/businesses/${slug}`, {
    schema: businessSchema,
  }).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  return <PageHeader title={shop.name} />;
}
```

`src/app/(auth)/layout.tsx`

```tsx
import { AuthShell } from '@/components/layout/auth-shell';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
```

---

## 4. F1: Auth

### 4.1 JWT verification (edge-safe, shared by middleware and server)

`src/lib/auth/jwt.ts`

```ts
import { jwtVerify } from 'jose';
import { z } from 'zod';
import { roleSchema, type SessionUser } from '@tuloy/shared';

const payloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  role: roleSchema,
  businessId: z.string().nullable().optional(),
  exp: z.number(),
});

export type VerifiedSession = SessionUser & { exp: number };

export async function verifyToken(
  token: string,
): Promise<VerifiedSession | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    const p = payloadSchema.parse(payload);
    return {
      id: p.sub,
      email: p.email,
      role: p.role,
      businessId: p.businessId ?? null,
      exp: p.exp,
    };
  } catch {
    return null; // expired, tampered, or wrong shape
  }
}
```

### 4.2 Server session helpers

`src/lib/auth/session.ts`

```ts
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Role, SessionUser } from '@tuloy/shared';
import { SESSION_COOKIE, homeFor } from './constants';
import { verifyToken } from './jwt';

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const v = await verifyToken(token);
  if (!v) return null;
  const { exp: _exp, ...user } = v;
  return user;
});

export async function requireSession(role: Role): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== role) redirect(homeFor(user.role));
  return user;
}
```

### 4.3 Open-redirect guard

`src/lib/auth/redirect.ts`

```ts
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
```

`src/lib/auth/redirect.test.ts` (Vitest)

```ts
import { describe, expect, it } from 'vitest';
import { safeNext } from './redirect';

describe('safeNext', () => {
  it('allows in-area paths', () => {
    expect(safeNext('/dashboard/services', 'BUSINESS_OWNER')).toBe(
      '/dashboard/services',
    );
    expect(safeNext('/admin', 'SUPER_ADMIN')).toBe('/admin');
  });
  it('rejects external, protocol-relative, and cross-role paths', () => {
    expect(safeNext('https://evil.com', 'BUSINESS_OWNER')).toBeNull();
    expect(safeNext('//evil.com', 'BUSINESS_OWNER')).toBeNull();
    expect(safeNext('/admin', 'BUSINESS_OWNER')).toBeNull();
    expect(safeNext('/dashboardx', 'BUSINESS_OWNER')).toBeNull();
    expect(safeNext(null, 'SUPER_ADMIN')).toBeNull();
  });
});
```

### 4.4 Login form

`src/components/forms/form-message-t.tsx`. shadcn's `FormMessage` prints the raw error text; ours translates the key.

```tsx
'use client';
import { useTranslations } from 'next-intl';
import { useFormField } from '@/components/ui/form';

export function FormMessageT() {
  const t = useTranslations();
  const { error, formMessageId } = useFormField();
  if (!error?.message) return null;
  return (
    <p id={formMessageId} className="text-sm text-destructive">
      {t(error.message as never)}
    </p>
  );
}
```

`src/features/auth/login-form.tsx`

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput, type Role } from '@tuloy/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { FormMessageT } from '@/components/forms/form-message-t';
import { safeNext } from '@/lib/auth/redirect';

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    }).catch(() => null);

    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setServerError(data.message ?? 'login_failed');
      return;
    }
    const role = data.user.role as Role;
    router.replace(safeNext(next, role) ?? data.redirectTo);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('email')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  {...field}
                />
              </FormControl>
              <FormMessageT />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('password')}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessageT />
            </FormItem>
          )}
        />
        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {t(serverError as never)}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Form>
  );
}
```

`src/app/(auth)/login/page.tsx`

```tsx
import { getTranslations } from 'next-intl/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoginForm } from '@/features/auth/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, t] = await Promise.all([
    searchParams,
    getTranslations('auth'),
  ]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('loginTitle')}</CardTitle>
        <CardDescription>{t('loginDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next} />
      </CardContent>
    </Card>
  );
}
```

### 4.5 Role-guarded layouts (defense in depth)

Layouts do **not** re-render on client-side navigation, so the layout check is a second gate, not the only one. The real data protection is the NestJS guards.

`src/app/(owner)/dashboard/layout.tsx`

```tsx
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { requireSession } from '@/lib/auth/session';
import { SessionProvider } from '@/stores/session-store';

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession('BUSINESS_OWNER');
  return (
    <SessionProvider initialUser={user}>
      <DashboardShell variant="owner">{children}</DashboardShell>
    </SessionProvider>
  );
}
```

`src/app/(admin)/admin/layout.tsx`

```tsx
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { requireSession } from '@/lib/auth/session';
import { SessionProvider } from '@/stores/session-store';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession('SUPER_ADMIN');
  return (
    <SessionProvider initialUser={user}>
      <DashboardShell variant="admin">{children}</DashboardShell>
    </SessionProvider>
  );
}
```

Stub pages (`dashboard/page.tsx`, `admin/page.tsx`):

```tsx
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/states';

export default async function Page() {
  const t = await getTranslations();
  return (
    <>
      <PageHeader title={t('nav.queue')} />
      <EmptyState title={t('dashboard.queueEmpty')} />
    </>
  );
}
// admin/page.tsx: same, with t('nav.shops') and t('admin.shopsEmpty')
```

### 4.6 Middleware

`middleware.ts` (at `apps/web/`, or `apps/web/src/` if you use a `src` dir)

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE, homeFor } from '@/lib/auth/constants';

export async function middleware(req: NextRequest) {
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
  if (pathname.startsWith('/dashboard') && user.role !== 'BUSINESS_OWNER') {
    return NextResponse.redirect(new URL(homeFor(user.role), req.url));
  }

  return NextResponse.next();
}

// Public customer routes never run through this.
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
};
```

**Next 16:** `middleware.ts` is renamed `proxy.ts` and the exported function is `proxy`. The body is identical; `jose` works in both runtimes.

---

## 5. Acceptance checklist

### F0: done when every route renders inside the right shell

- [ ] `pnpm dev` runs web and api, and `env.ts` fails fast with a readable error when a variable is missing
- [ ] `/` and `/b/<seeded-slug>` render in `PublicShell` (max-width ~480px, centered on desktop)
- [ ] `/b/does-not-exist` shows the not-found state, not a stack trace
- [ ] EN ↔ FIL toggle persists across a refresh and the `<html lang>` updates
- [ ] `/login` renders in `AuthShell`
- [ ] `pnpm build` passes (catches server/client boundary mistakes early)

### F1: role matrix (test with one Business Owner and one Super Admin from your seed)

| Visit        | Anonymous                  | Business Owner | Super Admin |
| ------------ | -------------------------- | -------------- | ----------- |
| `/b/<slug>`  | renders                    | renders        | renders     |
| `/login`     | renders                    | → `/dashboard` | → `/admin`  |
| `/dashboard` | → `/login?next=/dashboard` | renders        | → `/admin`  |
| `/admin`     | → `/login?next=/admin`     | → `/dashboard` | renders     |

- [ ] Wrong password shows "Wrong email or password." (in both languages) and keeps the form values
- [ ] After login, the `next` param is honored only for same-role paths (`?next=https://evil.com` falls back to the home route)
- [ ] The session cookie is `HttpOnly`, and `document.cookie` does not show it
- [ ] Deleting the cookie and clicking any dashboard link redirects to `/login`
- [ ] Setting a short JWT TTL in Nest (e.g. 1 minute) and waiting: the next API call clears the cookie and lands on `/login?next=…`
- [ ] Sign out clears the cookie and returns to `/login`; browser Back does not reveal the dashboard
- [ ] `GET /api/proxy/auth/login` returns 404 (auth is not in the allowlist)
- [ ] `safeNext` unit tests pass
- [ ] Mobile (360px): bottom nav shows, sidebar trigger is hidden, every nav target is at least 44px tall

---

## 6. Backend touchpoints and gotchas

1. **`trust proxy` in NestJS.** All proxied requests arrive from Vercel's IPs. The proxy forwards `x-forwarded-for`, but NestJS only uses it if you enable it (`app.set('trust proxy', <hops>)` on the Express adapter). Without it, the planned per-IP rate limit on queue joins will throttle every customer as one. Test this after F3.
2. **JWT lifetime.** There is no refresh flow in v0. Set the TTL to cover a full shift (8–12h) or owners get kicked out mid-service. This is a deliberate security trade-off; add refresh tokens later if the product grows.
3. **Secret sharing.** `JWT_SECRET` in the Next app must equal Nest's signing secret. If you ever move to RS256, only the public key is needed on the Next side.
4. **Socket.IO CORS (F2).** The browser connects to Nest directly for sockets, so `cors.origin` must include the Vercel domain. The BFF path doesn't need CORS because it is server-to-server.
5. **Vercel free tier and polling.** Everything goes through the proxy in F0/F1 for simplicity. In F3, if customer polling (15s fallback) eats function invocations, move **public GET** calls to direct browser → Nest with CORS, and keep the proxy for authed owner calls.
6. **Persisted-store hydration.** `ui-store` uses `skipHydration`. Anything that reads `soundEnabled` before the shell's effect runs sees the default; that is fine for a toggle.

---

## 7. Next: F2 (Owner board)

Starts with `useQueueSocket(slug)` (connect → join room → `invalidateQueries(['queue', slug])` → write to `realtime-store`), then `QueueBoard`, `TicketCard` and the transition map exported from `packages/shared`. Before starting, confirm the Queue module's response shapes (ticket, queue list) so the F2 zod schemas match them exactly.
