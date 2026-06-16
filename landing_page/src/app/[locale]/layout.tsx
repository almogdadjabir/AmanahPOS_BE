import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { alexandria, geist, jetbrainsMono } from '@/lib/fonts';
import '@/styles/globals.css';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const metadata: Metadata = {
  title: 'أمانة · AmanaPOS',
  description:
    'نظام نقاط بيع متكامل للمطاعم والمحلات في السودان. يقبل بنكك والكاش، يحسب القيمة المضافة، ويعمل حتى بدون إنترنت.',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'ar' | 'en')) {
    notFound();
  }

  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${alexandria.variable} ${geist.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Runs before paint — restores dark mode without flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');})()` }} />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
