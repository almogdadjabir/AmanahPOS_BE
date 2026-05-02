import { apiGet } from '@/lib/api';
import type { ApiList, StockLevel } from '@/types/api';
import PageTitle from '@/components/ds/PageTitle';
import EmptyState from '@/components/ds/EmptyState';
import Badge from '@/components/ui/Badge';

async function fetchStock(): Promise<StockLevel[]> {
  try {
    const res = await apiGet<ApiList<StockLevel>>('/api/v1/inventory/stock-levels/', { page_size: '100' });
    return res.results ?? [];
  } catch {
    return [];
  }
}

export default async function InventoryPage() {
  const items = await fetchStock();
  const lowStock = items.filter(i => i.is_low_stock || i.is_out_of_stock);

  return (
    <div>
      <PageTitle
        title="Inventory"
        description="Monitor stock levels across all your shops."
      />

      {lowStock.length > 0 && (
        <div className="mb-4 bg-warning-light border border-warning/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertIcon />
          <p className="text-[13px] font-semibold text-warning flex-1">
            {lowStock.length} item{lowStock.length !== 1 ? 's' : ''} below minimum stock level
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={<WarehouseIcon />}
            title="No stock data"
            description="Stock levels will appear here once products are added to your inventory."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-soft">
                  {['Product', 'Shop', 'SKU', 'Qty', 'Status'].map(h => (
                    <th key={h} className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-hint uppercase tracking-wider last:text-end">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-surface-soft transition-colors">
                    <td className="px-4 py-3 text-[13px] font-medium text-text-primary">{item.product_name}</td>
                    <td className="px-4 py-3 text-[13px] text-text-secondary">{item.shop_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-hint">{item.product_sku}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-text-primary">{item.quantity}</td>
                    <td className="px-4 py-3 text-end">
                      <Badge dot variant={item.is_out_of_stock ? 'danger' : item.is_low_stock ? 'warning' : 'success'}>
                        {item.is_out_of_stock ? 'Out of stock' : item.is_low_stock ? 'Low stock' : 'In stock'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function WarehouseIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>; }
function AlertIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
