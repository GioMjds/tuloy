'use client';

import {
  QueryClient,
  QueryClientProvider,
  environmentManager,
} from '@tanstack/react-query';
import { isApiError } from '@/lib/api/http-client';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, err) => {
          // Don't retry client errors (4xx); retry network/5xx up to 2 times.
          if (isApiError(err) && err.status >= 400 && err.status < 500)
            return false;
          return count < 2;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (environmentManager.isServer()) return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
