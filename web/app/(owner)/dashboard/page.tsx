import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/states';

export default async function DashboardPage() {
  const t = await getTranslations();
  return (
    <>
      <PageHeader title={t('nav.queue')} />
      <EmptyState title={t('dashboard.queueEmpty')} />
    </>
  );
}
