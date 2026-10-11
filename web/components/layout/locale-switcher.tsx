'use client';
import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { setLocale } from '@/i18n/actions';
import type { Locale } from '@/i18n/request';

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, start] = useTransition();
  const next: Locale = locale === 'en' ? 'fil' : 'en';

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Switch language to ${next === 'fil' ? 'Filipino' : 'English'}`}
      onClick={() =>
        start(async () => {
          await setLocale(next);
          router.refresh();
        })
      }
    >
      {locale === 'en' ? 'EN' : 'FIL'}
    </Button>
  );
}
