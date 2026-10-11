# Client Endpoints & TanStack Query Hooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5-layer API integration for `auth` and `queue` in Next.js web application (`web`), connecting to NestJS backend (`api`) using `validated-client` with TanStack Query hooks.

**Architecture:** Layered separation where Layer 1 (`client.ts`) handles transport and JWT resolution; Layer 2 (`endpoints/auth.ts`, `endpoints/queue.ts`) handles pure async API calls and Zod validation without React dependencies; Layer 3 (`hooks/use-auth.ts`, `hooks/use-queue.ts`) provides TanStack Query hooks and keys marked `'use client'`.

**Tech Stack:** Next.js 16 (App Router), React 19, `@tanstack/react-query` v5, Zod 4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-11-client-endpoints-design.md`

## Global Constraints

- Semantic token colors and 48x48px tap targets per `AGENTS.md`.
- No offline write queue in v0; mutations reject immediately when offline.
- Pure Server Components for all `page.tsx`; custom hooks marked `'use client'` in `web/lib/hooks/`.
- Single line comments; no emojis in comments.
- Zero extra external dependencies.

---

### Task 1: API Client Singleton (`web/lib/api/client.ts`)

**Files:**

- Create: `web/lib/api/client.ts`

**Interfaces:**

- Consumes: `createValidatedClient` from `web/lib/api/validated-client.ts`, `SESSION_COOKIE` from `web/lib/auth/constants.ts`
- Produces: `apiClient` singleton of type `ValidatedClient`

- [ ] **Step 1: Create client singleton**

Write `web/lib/api/client.ts`:

```typescript
import {
  createValidatedClient,
  type ValidatedClient,
} from './validated-client';
import { SESSION_COOKIE } from '../auth/constants';

function getClientCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

export const apiClient: ValidatedClient = createValidatedClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  getToken: () => getClientCookie(SESSION_COOKIE),
  onUnauthorized: () => {
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/dashboard') ||
        window.location.pathname.startsWith('/admin'))
    ) {
      window.location.href = `/login?next=${encodeURIComponent(
        window.location.pathname,
      )}`;
    }
  },
});
```

- [ ] **Step 2: Typecheck Task 1**

Run: `pnpm --filter web typegen`
Expected: PASS with 0 errors.

---

### Task 2: Auth Endpoints (`web/lib/endpoints/auth.ts`)

**Files:**

- Modify: `web/lib/endpoints/auth.ts`

**Interfaces:**

- Consumes: `apiClient` from `web/lib/api/client.ts`, `loginSchema`, `LoginInput`, `roleSchema` from `web/lib/auth/shared.ts`, `SESSION_COOKIE` from `web/lib/auth/constants.ts`
- Produces: `authUserSchema`, `authResponseSchema`, `authApi`

- [ ] **Step 1: Implement auth schemas and API methods**

Write `web/lib/endpoints/auth.ts`:

```typescript
import { z } from 'zod';
import { apiClient } from '../api/client';
import { roleSchema, type LoginInput } from '../auth/shared';
import { SESSION_COOKIE } from '../auth/constants';

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  role: roleSchema,
  businessId: z.string().nullable().optional(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
  owner: authUserSchema.optional(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const authApi = {
  async login(credentials: LoginInput): Promise<AuthResponse> {
    const data = await apiClient.post(
      '/auth/login',
      authResponseSchema,
      credentials,
    );
    if (typeof document !== 'undefined') {
      document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(
        data.accessToken,
      )}; path=/; max-age=604800; SameSite=Lax`;
    }
    return data;
  },

  async me(): Promise<AuthUser> {
    return apiClient.get('/auth/me', authUserSchema);
  },
};
```

- [ ] **Step 2: Typecheck Task 2**

Run: `pnpm --filter web typegen`
Expected: PASS with 0 errors.

---

### Task 3: Queue Endpoints (`web/lib/endpoints/queue.ts`)

**Files:**

- Modify: `web/lib/endpoints/queue.ts`

**Interfaces:**

- Consumes: `apiClient` from `web/lib/api/client.ts`
- Produces: `ticketStatusSchema`, `ticketSourceSchema`, `joinQueueInputSchema`, `ticketResponseSchema`, `ticketWithTokenSchema`, `queueApi`

- [ ] **Step 1: Implement queue schemas and API methods**

Write `web/lib/endpoints/queue.ts`:

```typescript
import { z } from 'zod';
import { apiClient } from '../api/client';

export const ticketStatusSchema = z.enum([
  'WAITING',
  'CALLED',
  'SERVING',
  'DONE',
  'SKIPPED',
  'NO_SHOW',
  'CANCELLED',
]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketSourceSchema = z.enum(['REMOTE', 'WALK_IN', 'KIOSK']);
export type TicketSource = z.infer<typeof ticketSourceSchema>;

export const joinQueueInputSchema = z.object({
  serviceId: z.string().uuid(),
  customerName: z.string().min(1).max(60),
  phone: z
    .string()
    .regex(/^(\+63|0)9\d{9}$/)
    .optional(),
  source: ticketSourceSchema.default('REMOTE'),
});
export type JoinQueueInput = z.infer<typeof joinQueueInputSchema>;

export const ticketResponseSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  serviceId: z.string(),
  number: z.number(),
  displayCode: z.string(),
  customerName: z.string(),
  phone: z.string().nullable(),
  source: ticketSourceSchema,
  status: ticketStatusSchema,
  queueDate: z.string(),
  createdAt: z.coerce.date(),
  calledAt: z.coerce.date().nullable(),
  servedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  position: z.number(),
  etaMinutes: z.number(),
});
export type TicketResponse = z.infer<typeof ticketResponseSchema>;

export const ticketWithTokenSchema = ticketResponseSchema.extend({
  token: z.string(),
});
export type TicketWithToken = z.infer<typeof ticketWithTokenSchema>;

export const queueApi = {
  async join(slug: string, dto: JoinQueueInput): Promise<TicketWithToken> {
    return apiClient.post(
      `/businesses/${slug}/queue`,
      ticketWithTokenSchema,
      dto,
    );
  },

  async getByToken(token: string): Promise<TicketWithToken> {
    return apiClient.get(`/queue/${token}`, ticketWithTokenSchema);
  },

  async list(slug: string): Promise<TicketResponse[]> {
    return apiClient.get(
      `/businesses/${slug}/queue`,
      z.array(ticketResponseSchema),
    );
  },

  async call(id: string): Promise<TicketResponse> {
    return apiClient.post(`/queue/${id}/call`, ticketResponseSchema);
  },

  async skip(id: string): Promise<TicketResponse> {
    return apiClient.post(`/queue/${id}/skip`, ticketResponseSchema);
  },

  async complete(id: string): Promise<TicketResponse> {
    return apiClient.post(`/queue/${id}/complete`, ticketResponseSchema);
  },

  async noShow(id: string): Promise<TicketResponse> {
    return apiClient.post(`/queue/${id}/no-show`, ticketResponseSchema);
  },
};
```

- [ ] **Step 2: Typecheck Task 3**

Run: `pnpm --filter web typegen`
Expected: PASS with 0 errors.

---

### Task 4: Auth TanStack Query Hooks (`web/lib/hooks/use-auth.ts`)

**Files:**

- Create: `web/lib/hooks/use-auth.ts`

**Interfaces:**

- Consumes: `authApi`, `AuthResponse`, `AuthUser` from `web/lib/endpoints/auth.ts`, `LoginInput` from `web/lib/auth/shared.ts`
- Produces: `authKeys`, `useLoginMutation`, `useCurrentUserQuery`

- [ ] **Step 1: Implement auth hooks and keys**

Write `web/lib/hooks/use-auth.ts`:

```typescript
'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { authApi, type AuthResponse, type AuthUser } from '../endpoints/auth';
import type { LoginInput } from '../auth/shared';
import type { ApiError } from '../api/http-client';

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

export function useLoginMutation(
  options?: UseMutationOptions<AuthResponse, ApiError, LoginInput>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: LoginInput) => authApi.login(credentials),
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(authKeys.me(), data.user);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useCurrentUserQuery(
  options?: Omit<UseQueryOptions<AuthUser, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => authApi.me(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}
```

- [ ] **Step 2: Typecheck Task 4**

Run: `pnpm --filter web typegen`
Expected: PASS with 0 errors.

---

### Task 5: Queue TanStack Query Hooks (`web/lib/hooks/use-queue.ts`)

**Files:**

- Create: `web/lib/hooks/use-queue.ts`

**Interfaces:**

- Consumes: `queueApi`, `TicketResponse`, `TicketWithToken`, `JoinQueueInput` from `web/lib/endpoints/queue.ts`
- Produces: `queueKeys`, `useJoinQueueMutation`, `useQueueTicketQuery`, `useOwnerQueueQuery`, `useCallTicketMutation`, `useSkipTicketMutation`, `useCompleteTicketMutation`, `useNoShowTicketMutation`

- [ ] **Step 1: Implement queue hooks and keys**

Write `web/lib/hooks/use-queue.ts`:

```typescript
'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  queueApi,
  type JoinQueueInput,
  type TicketResponse,
  type TicketWithToken,
} from '../endpoints/queue';
import type { ApiError } from '../api/http-client';

export const queueKeys = {
  all: ['queue'] as const,
  ticket: (token: string) => [...queueKeys.all, 'ticket', token] as const,
  list: (slug: string) => [...queueKeys.all, 'list', slug] as const,
};

const TERMINAL_STATUSES = new Set(['DONE', 'SKIPPED', 'NO_SHOW', 'CANCELLED']);

export function useJoinQueueMutation(
  slug: string,
  options?: UseMutationOptions<TicketWithToken, ApiError, JoinQueueInput>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: JoinQueueInput) => queueApi.join(slug, dto),
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(queueKeys.ticket(data.token), data);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useQueueTicketQuery(
  token: string,
  options?: {
    pollIntervalMs?: number;
  } & Omit<
    UseQueryOptions<TicketWithToken, ApiError>,
    'queryKey' | 'queryFn' | 'refetchInterval'
  >,
) {
  const { pollIntervalMs = 5000, ...queryOptions } = options ?? {};
  return useQuery({
    queryKey: queueKeys.ticket(token),
    queryFn: () => queueApi.getByToken(token),
    enabled: Boolean(token),
    refetchInterval: (query) => {
      const ticket = query.state.data;
      if (!ticket || TERMINAL_STATUSES.has(ticket.status)) {
        return false;
      }
      return pollIntervalMs;
    },
    ...queryOptions,
  });
}

export function useOwnerQueueQuery(
  slug: string,
  options?: {
    pollIntervalMs?: number;
  } & Omit<
    UseQueryOptions<TicketResponse[], ApiError>,
    'queryKey' | 'queryFn' | 'refetchInterval'
  >,
) {
  const { pollIntervalMs = 10000, ...queryOptions } = options ?? {};
  return useQuery({
    queryKey: queueKeys.list(slug),
    queryFn: () => queueApi.list(slug),
    enabled: Boolean(slug),
    refetchInterval: pollIntervalMs,
    ...queryOptions,
  });
}

export function useCallTicketMutation(
  slug: string,
  options?: UseMutationOptions<TicketResponse, ApiError, string>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => queueApi.call(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: queueKeys.list(slug) });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useSkipTicketMutation(
  slug: string,
  options?: UseMutationOptions<TicketResponse, ApiError, string>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => queueApi.skip(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: queueKeys.list(slug) });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useCompleteTicketMutation(
  slug: string,
  options?: UseMutationOptions<TicketResponse, ApiError, string>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => queueApi.complete(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: queueKeys.list(slug) });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useNoShowTicketMutation(
  slug: string,
  options?: UseMutationOptions<TicketResponse, ApiError, string>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => queueApi.noShow(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: queueKeys.list(slug) });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}
```

- [ ] **Step 2: Typecheck Task 5**

Run: `pnpm --filter web typegen`
Expected: PASS with 0 errors.

---

### Task 6: Full Verification & Integration Check

**Files:**

- Verify: all newly created/modified files

- [ ] **Step 1: Execute full TypeScript verification**

Run: `pnpm --filter web typegen`
Expected: Exits with code 0.

- [ ] **Step 2: Run linter**

Run: `pnpm --filter web lint`
Expected: Clean lint run without errors.
