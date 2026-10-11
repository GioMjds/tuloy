import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from './locale-switcher';

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common');
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex h-12 items-center justify-between px-4">
        <span className="font-semibold">{t('appName')}</span>
        <LocaleSwitcher />
      </header>
      <main className="flex-1 px-4 pb-8">{children}</main>
      <footer className="py-4 text-center text-xs text-muted-foreground">
        {t('poweredBy')}
      </footer>
    </div>
  );
}
