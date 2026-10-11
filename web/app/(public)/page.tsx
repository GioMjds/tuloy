import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';

export default async function Home() {
  const t = await getTranslations('common');
  return <PageHeader title={t('appName')} />;
}
