import { Nunito_Sans, Reem_Kufi, Tajawal, Geist, JetBrains_Mono } from 'next/font/google';

export const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  preload: true,
});

export const reemKufi = Reem_Kufi({
  subsets: ['arabic'],
  variable: '--font-reem-kufi',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
});

export const tajawal = Tajawal({
  subsets: ['arabic'],
  variable: '--font-tajawal',
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  preload: true,
});

export const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  preload: true,
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: true,
});
