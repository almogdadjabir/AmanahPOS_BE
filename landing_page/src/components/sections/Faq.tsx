import { useTranslations } from 'next-intl';
import SecHead from '@/components/ui/SecHead';
import ScrollReveal from '@/components/ui/ScrollReveal';

function Chevron() {
  return (
    <svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Faq() {
  const t = useTranslations('faq');

  const items = [
    { q: t('q1'), a: t('a1') },
    { q: t('q2'), a: t('a2') },
    { q: t('q3'), a: t('a3') },
    { q: t('q4'), a: t('a4') },
  ];

  return (
    <section id="faq" className="sec sec-divider">
      <div className="container-page">
        <SecHead eyebrow={t('eyebrow')} title={t('h2')} />

        <ScrollReveal className="faq">
          {items.map((item, i) => (
            <details key={i} className="faq-item" open={i === 0}>
              <summary>
                {item.q}
                <Chevron />
              </summary>
              <div className="faq-a">{item.a}</div>
            </details>
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}
