import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { serverFetch } from '@/lib/api-server';
import { ApiError } from '@/lib/api-error';
import { businessSchema } from '@/lib/endpoints/businesses';
import { formatPeso, formatTime, isOpenNow } from '@/lib/shop-hours';

export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [shop, t] = await Promise.all([
    serverFetch(`/businesses/${slug}`, { schema: businessSchema }).catch((e) => {
      if (e instanceof ApiError && e.status === 404) notFound();
      throw e;
    }),
    getTranslations('shop'),
  ]);
  const open = isOpenNow(shop.openTime, shop.closeTime, shop.timezone);

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title={shop.name}
          description={t('hours', {
            open: formatTime(shop.openTime),
            close: formatTime(shop.closeTime),
          })}
        />
        <Badge variant={open ? 'default' : 'secondary'}>
          {open ? t('openNow') : t('closedNow')}
        </Badge>
      </div>

      <section aria-labelledby="services-title">
        <h2 id="services-title" className="mb-2 text-lg font-semibold">
          {t('services')}
        </h2>
        {shop.services.length ? (
          <ul className="divide-y rounded-xl border">
            {shop.services.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('minutes', { n: s.durationMin })}
                  </p>
                </div>
                <p className="font-medium tabular-nums">
                  {formatPeso(s.priceCentavos)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t('servicesEmpty')}</p>
        )}
      </section>

      {/* Disabled until the join form ships (MVP task 4). */}
      <div>
        <Button
          disabled
          aria-describedby="join-soon"
          className="h-12 w-full text-base"
        >
          {t('joinQueue')}
        </Button>
        <p id="join-soon" className="mt-2 text-sm text-muted-foreground">
          {t('joinSoon')}
        </p>
      </div>
    </div>
  );
}
