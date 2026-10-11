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
