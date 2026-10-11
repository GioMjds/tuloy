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
