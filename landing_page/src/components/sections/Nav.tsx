import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';

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
          <a href="#how">{t('how')}</a>
          <a href="#pricing">{t('pricing')}</a>
          <a href="#">{t('signin')}</a>
        </div>

        <div className="lang-toggle" role="group" aria-label="Language">
          <Link href="/" locale="ar" className={locale === 'ar' ? 'active' : ''}>ع</Link>
          <Link href="/" locale="en" className={locale === 'en' ? 'active' : ''}>EN</Link>
        </div>

        <a href="#" className="btn">
          <span>{t('cta')}</span>
          <span className="arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </nav>
  );
}
