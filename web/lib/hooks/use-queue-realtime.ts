'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeStore } from '@/stores/realtime-store';
import { queueKeys } from './use-queue';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useQueueRealtime(slug: string) {
  const queryClient = useQueryClient();
  const setStatus = useRealtimeStore((s) => s.setStatus);

  useEffect(() => {
    if (!slug) return;

    const refresh = () =>
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    const socket = io(`${API_URL}/queue`, { query: { slug } });

    setStatus('connecting');
    socket.on('connect', () => {
      setStatus('live');
      refresh();
    });
    socket.on('disconnect', () => setStatus('offline'));
    socket.on('connect_error', () => setStatus('offline'));
    socket.on('queue.updated', refresh);

    return () => {
      socket.close();
      setStatus('idle');
    };
  }, [slug, queryClient, setStatus]);
}
