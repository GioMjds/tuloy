import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/states';

export default async function AdminPage() {
  const t = await getTranslations();
  return (
    <>
      <PageHeader title={t('nav.shops')} />
      <EmptyState title={t('admin.shopsEmpty')} />
    </>
  );
}
