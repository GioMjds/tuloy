import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const STEPS = ['step1', 'step2', 'step3'] as const;

export default async function Home() {
  const [t, tc] = await Promise.all([
    getTranslations('home'),
    getTranslations('common'),
  ]);
  return (
    <div className="space-y-8 pt-6">
      <section aria-labelledby="home-title">
        <h1
          id="home-title"
          className="text-3xl font-semibold tracking-tight text-balance"
        >
          {t('title')}
        </h1>
        <p className="mt-2 text-muted-foreground">{t('tagline')}</p>
      </section>

      <section
        id="shop-code"
        aria-labelledby="customer-title"
        className="rounded-xl border p-4"
      >
        <h2 id="customer-title" className="text-lg font-semibold">
          {t('customerTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('customerBody')}</p>
        {/* Plain GET form so it works before JS loads on slow connections. */}
        <form action="/b" className="mt-4 flex flex-col gap-2">
          <Label htmlFor="slug">{t('shopCode')}</Label>
          <Input
            id="slug"
            name="slug"
            required
            maxLength={64}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            placeholder="gupit-master"
            className="h-12 text-base"
          />
          <Button type="submit" className="h-12 text-base">
            {t('go')}
          </Button>
        </form>
      </section>

      <section aria-labelledby="steps-title">
        <h2 id="steps-title" className="text-lg font-semibold">
          {t('stepsTitle')}
        </h2>
        <ol className="mt-3 space-y-3">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full border font-semibold tabular-nums"
              >
                {i + 1}
              </span>
              <span className="pt-1">{t(step)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="owner-title" className="rounded-xl border p-4">
        <h2 id="owner-title" className="text-lg font-semibold">
          {t('ownerTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('ownerBody')}</p>
        <Link
          href="/login"
          className={buttonVariants({
            variant: 'outline',
            className: 'mt-4 h-12 w-full text-base',
          })}
        >
          {tc('signIn')}
        </Link>
      </section>
    </div>
  );
}
