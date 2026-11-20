import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';

export async function NotFoundBody() {
  const t = await getTranslations('states');
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">{t('notFoundTitle')}</h1>
      <p className="text-muted-foreground">{t('notFoundBody')}</p>
      <Link
        href="/#shop-code"
        className={buttonVariants({ className: 'h-12 px-6 text-base' })}
      >
        {t('backHome')}
      </Link>
    </div>
  );
}
