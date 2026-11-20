import Image from 'next/image';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import QRCode from 'qrcode';
import { CopyButton } from '@/components/copy-button';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/states';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { serverFetch } from '@/lib/api-server';
import { ApiError } from '@/lib/api-error';
import { myBusinessSchema } from '@/lib/endpoints/businesses';

export default async function SharePage() {
  const [t, shop] = await Promise.all([
    getTranslations(),
    serverFetch('/businesses/mine', {
      schema: myBusinessSchema,
      auth: true,
    }).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
  ]);

  if (!shop) {
    return (
      <>
        <PageHeader title={t('nav.share')} />
        <EmptyState title={t('share.noShop')} />
      </>
    );
  }

  // shortcut: origin comes from request headers, switch to an APP_URL env var if a proxy rewrites Host.
  const h = await headers();
  const proto = (h.get('x-forwarded-proto') ?? 'http').split(',')[0];
  const url = `${proto}://${h.get('host')}/b/${shop.slug}`;
  const qr = await QRCode.toDataURL(url, { width: 1024, margin: 2 });

  return (
    <>
      <PageHeader title={t('nav.share')} description={t('share.description')} />
      <div className="mx-auto max-w-sm space-y-4">
        <figure className="rounded-xl border bg-white p-4 text-neutral-900">
          <Image
            src={qr}
            alt={t('share.qrAlt', { name: shop.name })}
            width={1024}
            height={1024}
            className="h-auto w-full"
          />
          <figcaption className="mt-2 text-center font-semibold">
            {shop.name}
          </figcaption>
        </figure>
        <div className="space-y-2">
          <Label htmlFor="share-url">{t('share.linkLabel')}</Label>
          <Input
            id="share-url"
            readOnly
            value={url}
            className="h-12 text-base"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CopyButton value={url} />
          <a
            href={qr}
            download={`tuloy-${shop.slug}-qr.png`}
            className={buttonVariants({
              variant: 'outline',
              className: 'h-12 text-base',
            })}
          >
            {t('share.download')}
          </a>
        </div>
      </div>
    </>
  );
}
