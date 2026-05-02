import { apiGet } from '@/lib/api';
import type { ApiList, Sale } from '@/types/api';
import PageTitle from '@/components/ds/PageTitle';
import EmptyState from '@/components/ds/EmptyState';
import Avatar from '@/components/ui/Avatar';

async function fetchSales(): Promise<Sale[]> {
  try {
    const res = await apiGet<ApiList<Sale>>('/api/v1/sales/', { page_size: '50' });
    return res.results ?? [];
  } catch {
    return [];
  }
}

export default async function SalesPage() {
  const sales = await fetchSales();

  const methods: Record<string, string> = {
    cash: 'Cash', card: 'Card', bank_transfer: 'Bank',
    mobile_wallet: 'Mobile', loyalty_points: 'Points', split: 'Split', credit: 'Credit',
  };

  function fmt(v: number) {
    if (!v) return '0';
    if (v >= 1_000_000) return `${(v/1_000_000).toFixed(1)}M SDG`;
    if (v >= 1_000)     return `${(v/1_000).toFixed(1)}K SDG`;
    return `${v.toFixed(0)} SDG`;
  }

  return (
    <div>
      <PageTitle
        title="Sales"
        description="All completed transactions across your business."
      />

      <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
        {sales.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon />}
            title="No sales yet"
            description="Your completed sales will appear here once you record your first transaction."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-soft">
                  {['Receipt', 'Cashier', 'Method', 'Items', 'Amount', 'Date'].map(h => (
                    <th key={h} className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-hint uppercase tracking-wider last:text-end">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {sales.map(sale => {
                  const date = new Date(sale.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  });
                  return (
                    <tr key={sale.id} className="hover:bg-surface-soft transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-text-hint">{sale.receipt_number}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={sale.cashier_name} size={24} />
                          <span className="text-[13px] text-text-primary">{sale.cashier_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-muted text-[11px] font-medium text-text-secondary">
                          {methods[sale.payment_method] ?? sale.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-text-secondary">{sale.item_count}</td>
                      <td className="px-4 py-3 font-semibold text-text-primary text-[13px]">{fmt(parseFloat(sale.net_amount))}</td>
                      <td className="px-4 py-3 text-xs text-text-hint text-end">{date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ReceiptIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
