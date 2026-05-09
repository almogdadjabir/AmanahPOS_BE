import { useTranslations } from 'next-intl';

export default function Features() {
  const t = useTranslations('feat');

  return (
    <section id="features">
      <div className="container-page">

        <div className="section-rail" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="meta">
            <div className="num">02</div>
            <div className="label">{t('section')}</div>
            <div className="ar-label">{t('sectionAr')}</div>
          </div>
          <div>
            <h2 className="h2">
              {t('h2')} <em>{t('h2Accent')}</em>
            </h2>
            <p className="lede">{t('sub')}</p>
          </div>
        </div>

        {/* Feature 1: Offline */}
        <div className="feat">
          <div className="feat-text">
            <div className="feat-eye">
              <span className="num">01</span>
              <span className="lbl">{t('f1Lbl')}</span>
            </div>
            <h3>{t('f1T')}</h3>
            <p>{t('f1B')}</p>
            <ul className="feat-bullets">
              <li>{t('f1L1')}</li>
              <li>{t('f1L2')}</li>
              <li>{t('f1L3')}</li>
            </ul>
          </div>

          <div className="feat-vis">
            <span className="vis-tag">OFFLINE · MODE</span>
            <span className="vis-id">SYS·01</span>
            <div className="vis-offline">
              <div className="signal">
                <span className="dot" />
                <span className="lbl">OFFLINE</span>
              </div>
              <div className="stack">
                <div className="row">
                  <span className="t">14:22</span>
                  <span>فول مدمس × ١</span>
                  <span className="a">STORED</span>
                </div>
                <div className="row">
                  <span className="t">14:19</span>
                  <span>كركديه × ٢</span>
                  <span className="a">STORED</span>
                </div>
                <div className="row">
                  <span className="t">14:11</span>
                  <span>شاي بالحليب × ١</span>
                  <span className="a">STORED</span>
                </div>
              </div>
              <div className="summary">
                <div>
                  <div className="v">٣</div>
                  <div className="l">PENDING</div>
                </div>
                <div>
                  <div className="v">٠</div>
                  <div className="l">LOST</div>
                </div>
                <div>
                  <div className="v">AUTO</div>
                  <div className="l">SYNC</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: Business type */}
        <div className="feat flip">
          <div className="feat-text">
            <div className="feat-eye">
              <span className="num">02</span>
              <span className="lbl">{t('f2Lbl')}</span>
            </div>
            <h3>{t('f2T')}</h3>
            <p>{t('f2B')}</p>
            <ul className="feat-bullets">
              <li>{t('f2L1')}</li>
              <li>{t('f2L2')}</li>
              <li>{t('f2L3')}</li>
            </ul>
          </div>

          <div className="feat-vis">
            <span className="vis-tag">BUSINESS · TYPE</span>
            <span className="vis-id">SYS·02</span>
            <div className="vis-business">
              <div className="biz active">
                <div className="biz-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>
                  </svg>
                </div>
                <div>
                  <div className="biz-name">مطعم</div>
                  <div className="biz-tag">RESTAURANT</div>
                </div>
                <span className="check">✓ ACTIVE</span>
              </div>
              <div className="biz">
                <div className="biz-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </div>
                <div>
                  <div className="biz-name">دكان</div>
                  <div className="biz-tag">RETAIL</div>
                </div>
              </div>
              <div className="biz">
                <div className="biz-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <path d="M8 21h8M12 17v4"/>
                  </svg>
                </div>
                <div>
                  <div className="biz-name">هايبرد</div>
                  <div className="biz-tag">HYBRID</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3: Payments */}
        <div className="feat">
          <div className="feat-text">
            <div className="feat-eye">
              <span className="num">03</span>
              <span className="lbl">{t('f3Lbl')}</span>
            </div>
            <h3>{t('f3T')}</h3>
            <p>{t('f3B')}</p>
            <ul className="feat-bullets">
              <li>{t('f3L1')}</li>
              <li>{t('f3L2')}</li>
              <li>{t('f3L3')}</li>
            </ul>
          </div>

          <div className="feat-vis">
            <span className="vis-tag">PAYMENTS</span>
            <span className="vis-id">SYS·03</span>
            <div className="vis-pay">
              <div className="total-tag">TOTAL DUE</div>
              <div className="total-amt">
                8,140
                <span className="cur">SDG</span>
              </div>
              <div className="methods">
                <div className="method active">
                  <div className="glyph">ب</div>
                  <div>
                    <div className="name">Bankak</div>
                    <div className="desc">MOBILE WALLET</div>
                  </div>
                  <span className="ok">✓ SELECTED</span>
                </div>
                <div className="method">
                  <div className="glyph">$</div>
                  <div>
                    <div className="name">كاش</div>
                    <div className="desc">CASH</div>
                  </div>
                </div>
                <div className="method">
                  <div className="glyph">↔</div>
                  <div>
                    <div className="name">تحويل</div>
                    <div className="desc">BANK TRANSFER</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
