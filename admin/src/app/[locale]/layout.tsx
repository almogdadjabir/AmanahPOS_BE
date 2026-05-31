import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { geist, geistMono, tajawal } from '@/lib/fonts';
import '@/styles/globals.css';

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export const metadata: Metadata = {
  title: 'أمانة POS — لوحة الإدارة',
  description: 'لوحة إدارة أمانة POS',
  icons: { icon: '/favicon.svg' },
};

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as 'ar' | 'en')) notFound();

  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className={`${geist.variable} ${geistMono.variable} ${tajawal.variable}`}>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
