'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import PremiumKPIRow from './PremiumKPIRow';
import InboundReceivingPanel from './InboundReceivingPanel';
import InboundTransactionsList from './InboundTransactionsList';
import VendorsList from './VendorsList';
import LowStockList from './LowStockList';
import ExpiryReport from './ExpiryReport';
import VendorReport from './VendorReport';
import type { PremiumInventorySummary, Shop } from '@/types/api';

type Tab = 'stock' | 'inbound' | 'vendors' | 'lowstock' | 'expiry' | 'reports';

interface Props {
  summary:  PremiumInventorySummary | null;
  shops:    Shop[];
  children: React.ReactNode;
}

export default function PremiumInventoryShell({ summary, shops, children }: Props) {
  const t = useTranslations('inventory');
  const [activeTab,    setActiveTab]    = useState<Tab>('stock');
  const [visited,      setVisited]      = useState<Set<Tab>>(new Set(['stock']));
  const [lowStockHint, setLowStockHint] = useState<{ productName: string; quantity: string } | null>(null);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'stock',    label: t('premium.tabStock') },
    { id: 'inbound',  label: t('premium.tabInbound') },
    { id: 'vendors',  label: t('premium.tabVendors') },
    { id: 'lowstock', label: t('premium.tabLowStock') },
    { id: 'expiry',   label: t('premium.tabExpiry') },
    { id: 'reports',  label: t('premium.tabReports') },
  ];

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setVisited(prev => { const s = new Set(prev); s.add(tab); return s; });
  }

  function handleReceive(productName: string, quantity: string) {
    setLowStockHint({ productName, quantity });
    switchTab('inbound');
  }

  return (
    <div>
      {/* KPI row */}
      {summary && <PremiumKPIRow data={summary} />}

      {/* Tab bar — horizontally scrollable on narrow screens */}
      <div className="overflow-x-auto mb-6">
        <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock tab — always mounted */}
      <div className={cn(activeTab !== 'stock' && 'hidden')}>
        {children}
      </div>

      {/* Inbound tab — lazy */}
      {visited.has('inbound') && (
        <div className={cn(activeTab !== 'inbound' && 'hidden')}>
          {lowStockHint && (
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
              style={{
                background:  'linear-gradient(135deg, rgba(120,53,15,0.08) 0%, rgba(217,119,6,0.04) 100%)',
                border:      '1px solid rgba(217,119,6,0.20)',
                borderLeft:  '3px solid rgba(180,83,9,0.55)',
              }}
            >
              <p className="text-[12px] text-foreground flex-1">
                {t('premium.lowStockHint', {
                  productName: lowStockHint.productName,
                  quantity:    lowStockHint.quantity,
                })}
              </p>
              <button
                type="button"
                onClick={() => setLowStockHint(null)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t('premium.lowStockHintDismiss')}
              >
                <X size={14} />
              </button>
            </div>
          )}
          <InboundReceivingPanel enabled={true} shops={shops} />
          <InboundTransactionsList />
        </div>
      )}

      {/* Vendors tab — lazy */}
      {visited.has('vendors') && (
        <div className={cn(activeTab !== 'vendors' && 'hidden')}>
          <VendorsList />
        </div>
      )}

      {/* Low Stock tab — lazy */}
      {visited.has('lowstock') && (
        <div className={cn(activeTab !== 'lowstock' && 'hidden')}>
          <LowStockList shops={shops} onReceive={handleReceive} />
        </div>
      )}

      {/* Expiry tab — lazy */}
      {visited.has('expiry') && (
        <div className={cn(activeTab !== 'expiry' && 'hidden')}>
          <ExpiryReport shops={shops} />
        </div>
      )}

      {/* Reports tab — lazy */}
      {visited.has('reports') && (
        <div className={cn(activeTab !== 'reports' && 'hidden')}>
          <VendorReport shops={shops} />
        </div>
      )}
    </div>
  );
}
