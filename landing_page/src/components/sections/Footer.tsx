import { getTranslations } from 'next-intl/server';
import Logo from '@/components/ui/Logo';

type Column = { title: string; links: string[] };

export default async function Footer() {
  const t = await getTranslations('footer');
  const columns = t.raw('columns') as Column[];

  return (
    <footer className="bg-deep text-white/60 pt-16 pb-8 border-t border-white/10">
      <div className="container-page">
        <div className="grid grid-cols-2 md:grid-cols-[1.5fr_repeat(4,1fr)] gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="inline-flex items-center gap-2.5 text-white no-underline mb-3.5">
              <Logo size={30} />
              <span className="font-black text-[17px] tracking-tight">AmanaPOS</span>
            </a>
            <p className="text-[13.5px] leading-relaxed max-w-[280px]">
              {t('tagline')}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-white mb-3.5">
                {col.title}
              </div>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm font-semibold text-white/60 hover:text-white transition-colors no-underline"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/10 flex flex-wrap justify-between items-center gap-4">
          <p className="text-[13px] font-semibold">{t('copyright')}</p>

          {/* Social icons */}
          <div className="flex gap-3">
            {['X', 'F', 'I'].map((initial) => (
              <a
                key={initial}
                href="#"
                className="w-9 h-9 rounded-xl bg-white/8 grid place-items-center text-white/60 hover:text-white hover:bg-white/15 transition-colors no-underline"
                aria-label={initial}
              >
                <span className="text-[11px] font-extrabold">{initial}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
