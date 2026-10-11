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
    ...options,
    mutationFn: (credentials: LoginInput) => authApi.login(credentials),
    onSuccess: (...args) => {
      const [data] = args;
      queryClient.setQueryData(authKeys.me(), data.user);
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      options?.onSuccess?.(...args);
    },
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
