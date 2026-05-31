import { Lock, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function PremiumLockedInventoryCard() {
  const t = await getTranslations('inventory');
  return (
    <div
      className="relative overflow-hidden rounded-xl mb-5"
      style={{
        background:  'linear-gradient(135deg, rgba(120,53,15,0.16) 0%, rgba(180,83,9,0.09) 55%, rgba(217,119,6,0.04) 100%)',
        border:      '1px solid rgba(217,119,6,0.22)',
        boxShadow:   'inset 0 1px 0 rgba(251,191,36,0.14), 0 2px 16px rgba(120,53,15,0.08)',
      }}
    >
      {/* Shimmer sweep */}
      <div
        className="absolute inset-0 pointer-events-none animate-premium-shimmer"
        style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(251,191,36,0.07) 50%, transparent 65%)' }}
        aria-hidden
      />
      {/* Top gold accent line */}
      <div
        className="absolute top-0 left-8 right-8 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.55), transparent)' }}
        aria-hidden
      />

      <div className="relative px-5 pt-5 pb-4">
        {/* Badge */}
        <div className="mb-4">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.13em] uppercase px-2.5 py-1 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(217,119,6,0.16), rgba(245,158,11,0.08))',
              border:     '1px solid rgba(217,119,6,0.28)',
              color:      'rgb(146,64,14)',
            }}
          >
            <Zap size={9} strokeWidth={2.5} />
            {t('inbound.premiumBadge')}
          </span>
        </div>

        <div className="flex items-start gap-4">
          {/* Lock icon */}
          <div
            className="shrink-0 mt-0.5 flex items-center justify-center"
            style={{
              width: 48, height: 48,
              background:   'linear-gradient(145deg, rgba(120,53,15,0.32), rgba(146,64,14,0.16))',
              border:       '1px solid rgba(217,119,6,0.26)',
              borderRadius: 14,
              boxShadow:    '0 2px 10px rgba(120,53,15,0.16), inset 0 1px 0 rgba(251,191,36,0.16)',
            }}
          >
            <Lock size={20} strokeWidth={2} style={{ color: 'rgb(146,64,14)' }} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-snug mb-1.5" style={{ color: 'rgb(101,40,8)' }}>
              {t('premium.lockedTitle')}
            </p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {t('premium.lockedDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Decorative dot grid */}
      <div className="absolute bottom-3 right-4 pointer-events-none select-none" style={{ opacity: 0.055 }} aria-hidden>
        <svg width="52" height="28" viewBox="0 0 52 28" fill="none">
          {[0,9,18,27,36,45].flatMap(x =>
            [0,9,18].map(y => (
              <circle key={`${x}-${y}`} cx={x + 4} cy={y + 4} r={1.8} fill="rgb(146,64,14)" />
            ))
          )}
        </svg>
      </div>
    </div>
  );
}
