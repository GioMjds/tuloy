import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Providers } from '@/providers/query-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tuloy - Queue & Walk-in System',
  description:
    'Queue and appointment booking PWA for Filipino walk-in businesses',
  // Add more as needed, e.g., open graph, twitter card, etc.
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Add more as needed, e.g., maximumScale, userScalable, etc.
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Tuloy - Queue & Walk-in System',
  description:
    'Queue and appointment booking PWA for Filipino walk-in businesses',
  url: 'https://tuloy.vercel.app',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'All',
  browserRequirements: 'Requires a modern web browser.',
  // Add more as needed, e.g., screenshot, softwareVersion, etc.
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-dvh flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers>{children}</Providers>
            <Toaster richColors position="top-center" />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
