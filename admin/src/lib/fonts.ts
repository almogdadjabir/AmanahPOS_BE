import { Nunito_Sans, Tajawal } from 'next/font/google';

export const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['400', '600', '700', '800', '900'],
  display: 'swap',
});

export const tajawal = Tajawal({
  subsets: ['arabic'],
  variable: '--font-tajawal',
  weight: ['400', '500', '700', '800', '900'],
  display: 'swap',
});
