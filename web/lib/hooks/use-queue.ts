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
    ...options,
    mutationFn: (dto: JoinQueueInput) => queueApi.join(slug, dto),
    onSuccess: (...args) => {
      const [data] = args;
      queryClient.setQueryData(queueKeys.ticket(data.token), data);
      options?.onSuccess?.(...args);
    },
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
    ...options,
    mutationFn: (id: string) => queueApi.call(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queueKeys.list(slug) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useSkipTicketMutation(
  slug: string,
  options?: UseMutationOptions<TicketResponse, ApiError, string>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: (id: string) => queueApi.skip(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queueKeys.list(slug) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useCompleteTicketMutation(
  slug: string,
  options?: UseMutationOptions<TicketResponse, ApiError, string>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: (id: string) => queueApi.complete(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queueKeys.list(slug) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useNoShowTicketMutation(
  slug: string,
  options?: UseMutationOptions<TicketResponse, ApiError, string>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    mutationFn: (id: string) => queueApi.noShow(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queueKeys.list(slug) });
      options?.onSuccess?.(...args);
    },
  });
}
