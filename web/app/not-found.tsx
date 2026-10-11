import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/layout/states';

export default async function NotFound() {
  const t = await getTranslations('states');
  return <EmptyState title={t('notFoundTitle')} />;
}
