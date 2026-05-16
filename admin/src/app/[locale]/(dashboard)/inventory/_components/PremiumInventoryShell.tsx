'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import PremiumKPIRow from './PremiumKPIRow';
import InboundReceivingPanel from './InboundReceivingPanel';
import InboundTransactionsList from './InboundTransactionsList';
import VendorsList from './VendorsList';
import type { PremiumInventorySummary, Shop } from '@/types/api';

type Tab = 'stock' | 'inbound' | 'vendors';

interface Props {
  summary:  PremiumInventorySummary | null;
  shops:    Shop[];
  children: React.ReactNode; // Stock tab content: pre-rendered server components
}

export default function PremiumInventoryShell({ summary, shops, children }: Props) {
  const t = useTranslations('inventory');
  const [activeTab, setActiveTab] = useState<Tab>('stock');
  const [visited,   setVisited]   = useState<Set<Tab>>(new Set(['stock']));

  const TABS: { id: Tab; label: string }[] = [
    { id: 'stock',   label: t('premium.tabStock') },
    { id: 'inbound', label: t('premium.tabInbound') },
    { id: 'vendors', label: t('premium.tabVendors') },
  ];

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setVisited(prev => { const s = new Set(prev); s.add(tab); return s; });
  }

  return (
    <div>
      {/* KPI row — only when summary data is available */}
      {summary && <PremiumKPIRow data={summary} />}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchTab(tab.id)}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stock tab — always mounted (server-rendered children) */}
      <div className={cn(activeTab !== 'stock' && 'hidden')}>
        {children}
      </div>

      {/* Inbound tab — lazy: mount on first visit, stay mounted */}
      {visited.has('inbound') && (
        <div className={cn(activeTab !== 'inbound' && 'hidden')}>
          <InboundReceivingPanel enabled={true} shops={shops} />
          <InboundTransactionsList />
        </div>
      )}

      {/* Vendors tab — lazy: mount on first visit, stay mounted */}
      {visited.has('vendors') && (
        <div className={cn(activeTab !== 'vendors' && 'hidden')}>
          <VendorsList />
        </div>
      )}
    </div>
  );
}
