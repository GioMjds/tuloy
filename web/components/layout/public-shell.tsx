import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { LocaleSwitcher } from './locale-switcher';

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common');
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex h-12 items-center justify-between px-4">
        <Link href="/" className="flex h-12 items-center font-semibold">
          {t('appName')}
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/login"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            {t('signIn')}
          </Link>
          <LocaleSwitcher />
        </nav>
      </header>
      <main className="flex-1 px-4 pb-8">{children}</main>
      <footer className="py-4 text-center text-xs text-muted-foreground">
        {t('poweredBy')}
      </footer>
    </div>
  );
}
