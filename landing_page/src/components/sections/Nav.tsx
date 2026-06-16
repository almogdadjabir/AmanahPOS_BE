import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import MobileMenu from '@/components/MobileMenu';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || '#';

export default function Nav() {
  const t = useTranslations('nav');
  const locale = useLocale();

  return (
    <nav className="nav">
      <div className="container-page nav-inner">
        <Link href="/" className="logo" aria-label="AmanaPOS">
          <span className="logo-mark">أ</span>
          <span className="ar">أمانة</span>
          <span className="la">AmanaPOS</span>
        </Link>

        <div className="nav-links">
          <a href="#features">{t('features')}</a>
          <a href="#demo">{t('demo')}</a>
          <a href="#how">{t('how')}</a>
          <a href="#pricing">{t('pricing')}</a>
          <a href={DASHBOARD_URL}>{t('signin')}</a>
        </div>

        <div className="lang-toggle" role="group" aria-label="Language">
          <Link href="/" locale="ar" className={locale === 'ar' ? 'active' : ''}>ع</Link>
          <Link href="/" locale="en" className={locale === 'en' ? 'active' : ''}>EN</Link>
        </div>

        <ThemeToggle />

        <a href={DASHBOARD_URL} className="btn nav-cta">
          <span>{t('cta')}</span>
          <span className="arrow" aria-hidden="true">→</span>
        </a>

        <MobileMenu />
      </div>
    </nav>
  );
}
