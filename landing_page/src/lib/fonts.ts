import { Alexandria, Geist, JetBrains_Mono } from 'next/font/google';

export const alexandria = Alexandria({
  subsets: ['arabic'],
  variable: '--font-alexandria',
  weight: ['300', '400', '500', '600', '700', '800'],
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
