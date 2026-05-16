'use client';

import { type CSSProperties, ReactNode, useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Plus, RefreshCcw, ScanLine, Sparkles, Truck, Users } from 'lucide-react';
import { PremiumFrame } from '@/components/premium/PremiumFrame';
import Drawer from '@/components/ds/Drawer';
import {
  HealthRing, InboundVelocity, RestockQueue, ExpiryTimeline,
  VendorBoard, RecentReceipts, QuickCommand,
  type RestockItem, type ExpiryBatchLite, type VendorLite, type ReceiptLite,
} from './tiles';
import StockDrawerContent from './StockDrawerContent';
import LowStockList from './LowStockList';
import ExpiryReport from './ExpiryReport';
import VendorsList from './VendorsList';
import InboundReceivingPanel from './InboundReceivingPanel';
import InboundTransactionsList from './InboundTransactionsList';
import type { PremiumInventorySummary, Shop } from '@/types/api';

const KPI_CARD_STYLE: CSSProperties = {
  background:     'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
  border:         '1px solid rgba(255,255,255,0.09)',
  backdropFilter: 'blur(14px)',
  boxShadow:      'inset 0 1px 0 rgba(255,255,255,0.08)',
};

type DrawerKey = null | 'stock' | 'lowstock' | 'expiry' | 'inbound' | 'vendors';

interface Props {
  shops:   Shop[];
  summary: PremiumInventorySummary | null;
  data: {
    health:   { pct: number; inStock: number; low: number; out: number };
    velocity: { series: number[]; labels: string[]; avgPerDay: number; peak: { value: number; label: string }; spend: string; deltaPct: number };
    restock:  RestockItem[];
    expiry:   { batches: ExpiryBatchLite[]; nearestDangerCount: number; suggestion?: string };
    vendors:  VendorLite[];
    receipts: ReceiptLite[];
  };
}

export default function PremiumInventoryShell({ shops, summary, data }: Props) {
  const t = useTranslations('inventory');
  const [drawer, setDrawer] = useState<DrawerKey>(null);

  const heroKpis = useMemo(() => [
    {
      label: t('premium.kpiHealth'),
      value: `${data.health.pct.toFixed(1)}%`,
      sub:   `${data.health.inStock} / ${data.health.inStock + data.health.low + data.health.out} healthy`,
      tone:  '#5EEAD4',
    },
    {
      label: t('premium.kpiRestock'),
      value: `${data.health.low + data.health.out}`,
      sub:   `${data.health.low} low · ${data.health.out} out`,
      tone:  '#FCD34D',
    },
    {
      label: t('premium.kpiInboundMonth'),
      value: summary?.inbound_this_month?.toString() ?? '0',
      sub:   summary?.units_received != null ? `${summary.units_received} units received` : '—',
      tone:  '#93C5FD',
    },
    {
      label: t('premium.kpiExpiring30'),
      value: `${data.expiry.batches.length}`,
      sub:   `${data.expiry.nearestDangerCount} in next 5 days`,
      tone:  '#FCA5A5',
    },
  ], [t, data.health, data.expiry.batches.length, data.expiry.nearestDangerCount, summary]);

  const handleReceive = useCallback((_it: RestockItem) => { setDrawer('inbound'); }, []);
  const handleLowStockReceive = useCallback((_name: string, _qty: string) => { setDrawer('inbound'); }, []);

  return (
    <>
      <PremiumFrame
        feature={t('premium.featureName')}
        plan={t('premium.planName')}
        subtitle={`${shops.length} ${shops.length === 1 ? 'shop' : 'shops'} · ${summary?.total_skus ?? 0} SKUs · ${data.vendors.length} vendors`}
        actions={
          <>
            <HeaderBtn variant="ghost" icon={<ScanLine className="h-3.5 w-3.5" />} disabled>Scan</HeaderBtn>
            <HeaderBtn variant="ghost" icon={<Download className="h-3.5 w-3.5" />} disabled>Export</HeaderBtn>
            <HeaderBtn variant="cta" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDrawer('inbound')}>
              {t('premium.receiveStock')}
            </HeaderBtn>
          </>
        }
        heroChildren={
          <div className="grid grid-cols-4 gap-4">
            {heroKpis.map((k) => (
              <div
                key={k.label}
                className="p-4 rounded-xl"
                style={KPI_CARD_STYLE}
              >
                <div className="text-[10.5px] font-extrabold uppercase tracking-[0.5px] text-white/55">{k.label}</div>
                <div className="mt-0.5 text-[28px] font-extrabold text-white tabular-nums tracking-tight">{k.value}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: k.tone, boxShadow: `0 0 8px ${k.tone}` }} />
                  <span className="text-[11px] font-semibold text-white/70">{k.sub}</span>
                </div>
              </div>
            ))}
          </div>
        }
      >
        {/* Bento grid */}
        <div
          className="grid grid-cols-4 gap-4"
          style={{ gridAutoRows: 'minmax(170px, auto)' }}
        >
          <HealthRing {...data.health} onOpen={() => setDrawer('stock')} />
          <InboundVelocity {...data.velocity} onOpen={() => setDrawer('inbound')} />
          <RestockQueue items={data.restock} onReceive={handleReceive} onOpenAll={() => setDrawer('lowstock')} />
          <ExpiryTimeline
            batches={data.expiry.batches}
            suggestion={data.expiry.suggestion ? <span>{data.expiry.suggestion}</span> : undefined}
            onOpen={() => setDrawer('expiry')}
          />
          <VendorBoard vendors={data.vendors} onOpenAll={() => setDrawer('vendors')} />
          <RecentReceipts receipts={data.receipts} onOpen={() => setDrawer('inbound')} />
          <QuickCommand
            actions={[
              { label: t('premium.quickReceive'), hint: t('premium.quickReceiveHint'), icon: <Truck className="h-3.5 w-3.5" />,    primary: true, onClick: () => setDrawer('inbound') },
              { label: t('premium.quickAdjust'),  hint: t('premium.quickAdjustHint'),  icon: <RefreshCcw className="h-3.5 w-3.5" />,              onClick: () => setDrawer('stock') },
              { label: t('premium.quickVendor'),  hint: t('premium.quickVendorHint'),  icon: <Users className="h-3.5 w-3.5" />,                   onClick: () => setDrawer('vendors') },
              { label: t('premium.quickReport'),  hint: t('premium.quickReportHint'),  icon: <Sparkles className="h-3.5 w-3.5" />,                onClick: () => setDrawer('inbound') },
            ]}
          />
        </div>
      </PremiumFrame>

      {/* ── Drawers ─────────────────────────────────────────────────── */}

      <Drawer open={drawer === 'stock'} onClose={() => setDrawer(null)} title="Stock Levels">
        {drawer === 'stock' && <StockDrawerContent shops={shops} />}
      </Drawer>

      <Drawer open={drawer === 'lowstock'} onClose={() => setDrawer(null)} title="Low Stock">
        {drawer === 'lowstock' && (
          <div className="p-5">
            <LowStockList shops={shops} onReceive={handleLowStockReceive} />
          </div>
        )}
      </Drawer>

      <Drawer open={drawer === 'expiry'} onClose={() => setDrawer(null)} title="Expiry Report">
        {drawer === 'expiry' && (
          <div className="p-5">
            <ExpiryReport shops={shops} />
          </div>
        )}
      </Drawer>

      <Drawer open={drawer === 'inbound'} onClose={() => setDrawer(null)} title="Inbound">
        {drawer === 'inbound' && (
          <div className="p-5 flex flex-col gap-6">
            <InboundReceivingPanel enabled={true} shops={shops} />
            <InboundTransactionsList />
          </div>
        )}
      </Drawer>

      <Drawer open={drawer === 'vendors'} onClose={() => setDrawer(null)} title="Vendors">
        {drawer === 'vendors' && (
          <div className="p-5">
            <VendorsList />
          </div>
        )}
      </Drawer>
    </>
  );
}

// ── Local helpers ──────────────────────────────────────────────────────

function HeaderBtn({
  variant = 'ghost', icon, children, onClick, disabled,
}: {
  variant?:  'ghost' | 'cta';
  icon:      ReactNode;
  children:  ReactNode;
  onClick?:  () => void;
  disabled?: boolean;
}) {
  const isCta = variant === 'cta';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-[12.5px] font-extrabold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={
        isCta
          ? { background: 'linear-gradient(180deg, #D97706 0%, #92400E 100%)', color: 'white', border: '1px solid rgba(244,219,169,0.25)', boxShadow: '0 8px 20px -10px rgba(120,53,15,0.55), inset 0 1px 0 rgba(255,255,255,0.20)' }
          : { background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', color: 'white', border: '1px solid rgba(255,255,255,0.18)' }
      }
    >
      {icon}
      {children}
    </button>
  );
}
