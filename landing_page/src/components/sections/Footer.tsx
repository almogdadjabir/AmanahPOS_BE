import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('foot');

  return (
    <footer>
      <div className="container-page">
        <div className="foot-grid">

          {/* Brand column */}
          <div>
            <a href="#" className="logo" aria-label="AmanaPOS">
              <span className="logo-mark">أ</span>
              <span className="ar">أمانة</span>
              <span className="la">AmanaPOS</span>
            </a>
            <p className="foot-tag">{t('tag')}</p>
          </div>

          {/* Product */}
          <div className="foot-col">
            <h4>{t('c1')}</h4>
            <ul>
              <li><a href="#features">{t('c1a')}</a></li>
              <li><a href="#pricing">{t('c1b')}</a></li>
              <li><a href="#">{t('c1c')}</a></li>
              <li><a href="#">{t('c1d')}</a></li>
            </ul>
          </div>

          {/* Company */}
          <div className="foot-col">
            <h4>{t('c2')}</h4>
            <ul>
              <li><a href="#">{t('c2a')}</a></li>
              <li><a href="#">{t('c2b')}</a></li>
              <li><a href="#">{t('c2c')}</a></li>
              <li><a href="#">{t('c2d')}</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="foot-col">
            <h4>{t('c3')}</h4>
            <ul>
              <li><a href="#">{t('c3a')}</a></li>
              <li><a href="#">{t('c3b')}</a></li>
              <li><a href="#">{t('c3c')}</a></li>
              <li><a href="#">{t('c3d')}</a></li>
            </ul>
          </div>

        </div>

        <div className="foot-bottom">
          <span>{t('copy')}</span>
          <span>{t('built')}</span>
        </div>
      </div>
    </footer>
  );
}
