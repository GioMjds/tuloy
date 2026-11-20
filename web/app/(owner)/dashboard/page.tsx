import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/states';
import { buttonVariants } from '@/components/ui/button';

export default async function DashboardPage() {
  const t = await getTranslations();
  return (
    <>
      <PageHeader title={t('nav.queue')} />
      <EmptyState
        title={t('dashboard.queueEmpty')}
        description={t('dashboard.queueEmptyHint')}
      >
        <Link
          href="/dashboard/share"
          className={buttonVariants({ className: 'h-12 px-6 text-base' })}
        >
          {t('dashboard.shareShop')}
        </Link>
      </EmptyState>
    </>
  );
}
