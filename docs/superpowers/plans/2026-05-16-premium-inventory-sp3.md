# Premium Inventory Sub-project 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Low Stock, Expiry, and Reports tabs to the existing premium inventory shell, completing the 6-tab Inventory Control Center.

**Architecture:** Three new lazy-mounted Client Components (`LowStockList`, `ExpiryReport`, `VendorReport`) added to the existing `PremiumInventoryShell`. A `lowStockHint` state in the shell enables the cross-tab "Receive" CTA — clicking it on a low-stock row switches to the Inbound tab and shows a dismissible restocking banner. One new server action (`fetchVendorSummaryAction`) wraps the existing `inbound/vendor-summary/` backend endpoint.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, next-intl, existing `fetchStockLevelsAction` / `fetchExpiryReportAction` actions from SP1.

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Modify | `admin/src/types/api.ts` | Add `VendorSummaryItem`, `VendorSummaryData` |
| Modify | `admin/src/messages/en.json` | Add 5 premium keys + `lowStock.*`, `expiry.*`, `reports.*` sections |
| Modify | `admin/src/messages/ar.json` | Same in Arabic |
| Modify | `admin/src/actions/inventory.ts` | Add `fetchVendorSummaryAction` + types |
| Create | `admin/src/app/[locale]/(dashboard)/inventory/_components/LowStockList.tsx` | Low Stock tab |
| Create | `admin/src/app/[locale]/(dashboard)/inventory/_components/ExpiryReport.tsx` | Expiry tab |
| Create | `admin/src/app/[locale]/(dashboard)/inventory/_components/VendorReport.tsx` | Reports tab |
| Modify | `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumInventoryShell.tsx` | Add 3 tabs + hint state |

---

## Task 1: Types + i18n + `fetchVendorSummaryAction`

**Files:**
- Modify: `admin/src/types/api.ts`
- Modify: `admin/src/messages/en.json`
- Modify: `admin/src/messages/ar.json`
- Modify: `admin/src/actions/inventory.ts`

### 1a — Types

- [ ] **Step 1: Add `VendorSummaryItem` and `VendorSummaryData` to `admin/src/types/api.ts`**

Locate the `ExpiryBatch` interface (added in SP1, near the bottom of the types section). After it, add:

```typescript
export interface VendorSummaryItem {
  vendor_id:          string;
  vendor_name:        string;
  transactions_count: number;
  total_quantity:     string;
}

export interface VendorSummaryData {
  total_transactions: number;
  total_quantity:     string;
  vendors:            VendorSummaryItem[];
}
```

### 1b — i18n

- [ ] **Step 2: Add keys to `admin/src/messages/en.json`**

In the `"inventory"` object, find the `"premium"` section. It currently ends with `"kpiUnitsReceived": "Units Received"`. Add 5 new keys after it:

```json
      "tabLowStock": "Low Stock",
      "tabExpiry": "Expiry",
      "tabReports": "Reports",
      "lowStockHint": "Restocking reminder: {productName} is at {quantity} units.",
      "lowStockHintDismiss": "Dismiss"
```

Then, after the closing `}` of the `"reports"` section (or at the end of the `"inventory"` object), add these three new sections — note they are siblings of `"premium"`, `"vendors"`, `"inbound"` etc.:

```json
    "lowStock": {
      "title": "Low Stock",
      "colProduct": "Product",
      "colSku": "SKU",
      "colShop": "Shop",
      "colQty": "Qty",
      "colStatus": "Status",
      "receive": "Receive",
      "empty": "All products are well-stocked — nothing needs restocking right now.",
      "loadMore": "Load more",
      "failedToLoad": "Failed to load low stock report",
      "searchPlaceholder": "Search products…",
      "shopFilter": "All shops"
    },
    "expiry": {
      "title": "Expiry Report",
      "filterAll": "All",
      "filterExpiringSoon": "Expiring Soon",
      "filterExpired": "Expired",
      "colProduct": "Product",
      "colSku": "SKU",
      "colShop": "Shop",
      "colBatch": "Batch #",
      "colQty": "Qty",
      "colDays": "Days",
      "emptyAll": "No batches on record.",
      "emptyExpiringSoon": "No batches expiring in the next 30 days.",
      "emptyExpired": "No expired batches.",
      "loadMore": "Load more",
      "failedToLoad": "Failed to load expiry report",
      "shopFilter": "All shops"
    },
    "reports": {
      "title": "Vendor Report",
      "totalTransactions": "Total Transactions",
      "totalUnits": "Total Units Received",
      "colVendor": "Vendor",
      "colTransactions": "Transactions",
      "colTotalQty": "Total Qty",
      "dateFrom": "From",
      "dateTo": "To",
      "apply": "Apply",
      "shopFilter": "All shops",
      "empty": "No inbound transactions found for the selected period.",
      "failedToLoad": "Failed to load vendor report"
    }
```

- [ ] **Step 3: Add same keys to `admin/src/messages/ar.json`**

Add the 5 premium keys to the Arabic `"premium"` section:

```json
      "tabLowStock": "مخزون منخفض",
      "tabExpiry": "الانتهاء",
      "tabReports": "التقارير",
      "lowStockHint": "تذكير إعادة التخزين: {productName} لديه {quantity} وحدة فقط.",
      "lowStockHintDismiss": "إغلاق"
```

Then add the three new Arabic sections:

```json
    "lowStock": {
      "title": "مخزون منخفض",
      "colProduct": "المنتج",
      "colSku": "الرمز",
      "colShop": "الفرع",
      "colQty": "الكمية",
      "colStatus": "الحالة",
      "receive": "استلام",
      "empty": "جميع المنتجات في مستويات جيدة — لا شيء يحتاج إعادة تخزين.",
      "loadMore": "تحميل المزيد",
      "failedToLoad": "فشل تحميل تقرير المخزون المنخفض",
      "searchPlaceholder": "بحث عن منتج…",
      "shopFilter": "كل الفروع"
    },
    "expiry": {
      "title": "تقرير الانتهاء",
      "filterAll": "الكل",
      "filterExpiringSoon": "تنتهي قريباً",
      "filterExpired": "منتهية",
      "colProduct": "المنتج",
      "colSku": "الرمز",
      "colShop": "الفرع",
      "colBatch": "رقم الدفعة",
      "colQty": "الكمية",
      "colDays": "الأيام",
      "emptyAll": "لا توجد دفعات مسجّلة.",
      "emptyExpiringSoon": "لا توجد دفعات تنتهي خلال 30 يوماً.",
      "emptyExpired": "لا توجد دفعات منتهية الصلاحية.",
      "loadMore": "تحميل المزيد",
      "failedToLoad": "فشل تحميل تقرير الانتهاء",
      "shopFilter": "كل الفروع"
    },
    "reports": {
      "title": "تقرير الموردين",
      "totalTransactions": "إجمالي الحركات",
      "totalUnits": "إجمالي الوحدات المستلمة",
      "colVendor": "المورد",
      "colTransactions": "الحركات",
      "colTotalQty": "إجمالي الكمية",
      "dateFrom": "من",
      "dateTo": "إلى",
      "apply": "تطبيق",
      "shopFilter": "كل الفروع",
      "empty": "لا توجد حركات وارد للفترة المحددة.",
      "failedToLoad": "فشل تحميل تقرير الموردين"
    }
```

### 1c — Action

- [ ] **Step 4: Append `fetchVendorSummaryAction` to `admin/src/actions/inventory.ts`**

Append at the very end of the file:

```typescript
// ── Vendor inbound summary ────────────────────────────────────────────────────

export interface VendorSummaryParams {
  shop_id?:   string;
  date_from?: string;
  date_to?:   string;
}

export type VendorSummaryResult =
  | { ok: true; data: VendorSummaryData }
  | { ok: false; error: string };

export async function fetchVendorSummaryAction(
  params: VendorSummaryParams = {},
): Promise<VendorSummaryResult> {
  try {
    const url = new URL(`${API()}/api/v1/inventory/inbound/vendor-summary/`);
    if (params.shop_id)   url.searchParams.set('shop_id',   params.shop_id);
    if (params.date_from) url.searchParams.set('date_from', params.date_from);
    if (params.date_to)   url.searchParams.set('date_to',   params.date_to);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: (json as ApiResponse<VendorSummaryData>).data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
```

Also update the type import at line 7 of the file to include `VendorSummaryData`:

```typescript
import type { ApiList, ApiResponse, ExpiryBatch, InboundTransaction, PremiumInventorySummary, Product, StockLevel, StockMovement, Vendor, VendorSummaryData } from '@/types/api';
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add admin/src/types/api.ts admin/src/messages/en.json admin/src/messages/ar.json admin/src/actions/inventory.ts
git commit -m "feat: SP3 types, i18n, and fetchVendorSummaryAction"
```

---

## Task 2: `LowStockList` component

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/LowStockList.tsx`

- [ ] **Step 1: Create `LowStockList.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/LowStockList.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchStockLevelsAction } from '@/actions/inventory';
import type { Shop, StockLevel } from '@/types/api';

interface Props {
  shops:     Shop[];
  onReceive: (productName: string, quantity: string) => void;
}

export default function LowStockList({ shops, onReceive }: Props) {
  const t = useTranslations('inventory');
  const [items,       setItems]       = useState<StockLevel[]>([]);
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [rawSearch,   setRawSearch]   = useState('');
  const [search,      setSearch]      = useState('');
  const [shopId,      setShopId]      = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, append = false) => {
    if (p === 1) setLoading(true);
    else         setLoadingMore(true);
    setError(null);

    const res = await fetchStockLevelsAction({
      status: 'low_stock',
      search: search || undefined,
      shop:   shopId || undefined,
      page:   p,
      limit:  50,
    });

    if (res.ok) {
      setItems(prev => append ? [...prev, ...res.data] : res.data);
      setTotal(res.count);
    } else {
      setError(res.error);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [search, shopId]);

  useEffect(() => { load(1); setPage(1); }, [load]);

  useEffect(() => {
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, []);

  function handleSearchChange(val: string) {
    setRawSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 300);
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    load(next, true);
  }

  const hasMore = items.length < total;

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={rawSearch}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder={t('lowStock.searchPlaceholder')}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        />
        {shops.length > 1 && (
          <select
            value={shopId}
            onChange={e => setShopId(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t('lowStock.shopFilter')}</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <p className="text-xs font-semibold text-destructive flex-1">{error}</p>
          <button type="button" onClick={() => load(1)} className="text-xs text-primary hover:underline">
            {t('common.retry')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-12">
          {t('lowStock.empty')}
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
              {[
                t('lowStock.colProduct'),
                t('lowStock.colSku'),
                t('lowStock.colShop'),
                t('lowStock.colQty'),
                t('lowStock.colStatus'),
              ].map((h, i) => (
                <span key={i} className="text-[11px] font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>

            {/* Rows */}
            {items.map(item => (
              <div
                key={item.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 border-b border-border last:border-0 items-center"
              >
                <span className="text-[13px] font-semibold text-foreground truncate">{item.product_name}</span>
                <span className="text-[12px] text-muted-foreground truncate">{item.product_sku || '—'}</span>
                <span className="text-[12px] text-muted-foreground truncate">{item.shop_name}</span>
                <span className={cn(
                  'text-[13px] font-bold',
                  item.is_out_of_stock ? 'text-destructive' : 'text-amber-600',
                )}>
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onReceive(item.product_name, item.quantity)}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgb(180,83,9), rgb(146,64,14))',
                    color:      'white',
                  }}
                >
                  {t('lowStock.receive')}
                </button>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-3 w-full py-2 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {loadingMore ? '…' : t('lowStock.loadMore')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add "admin/src/app/[locale]/(dashboard)/inventory/_components/LowStockList.tsx"
git commit -m "feat: LowStockList component for Low Stock tab"
```

---

## Task 3: `ExpiryReport` component

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/ExpiryReport.tsx`

- [ ] **Step 1: Create `ExpiryReport.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/ExpiryReport.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchExpiryReportAction, type ExpiryReportParams } from '@/actions/inventory';
import type { ExpiryBatch, Shop } from '@/types/api';

type StatusFilter = 'all' | 'expiring_soon' | 'expired';

interface Props {
  shops: Shop[];
}

export default function ExpiryReport({ shops }: Props) {
  const t      = useTranslations('inventory');
  const locale = useLocale();
  const [batches,     setBatches]     = useState<ExpiryBatch[]>([]);
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [status,      setStatus]      = useState<StatusFilter>('all');
  const [shopId,      setShopId]      = useState('');

  const load = useCallback(async (p: number, append = false) => {
    if (p === 1) setLoading(true);
    else         setLoadingMore(true);
    setError(null);

    const params: ExpiryReportParams = {
      status:  status,
      shop_id: shopId || undefined,
      page:    p,
    };

    const res = await fetchExpiryReportAction(params);
    if (res.ok) {
      setBatches(prev => append ? [...prev, ...res.data] : res.data);
      setTotal(res.count);
    } else {
      setError(res.error);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [status, shopId]);

  useEffect(() => { load(1); setPage(1); }, [load]);

  function changeStatus(s: StatusFilter) { setStatus(s); }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    load(next, true);
  }

  const hasMore = items => items.length < total;

  const STATUS_TABS: { value: StatusFilter; label: string }[] = [
    { value: 'all',           label: t('expiry.filterAll') },
    { value: 'expiring_soon', label: t('expiry.filterExpiringSoon') },
    { value: 'expired',       label: t('expiry.filterExpired') },
  ];

  const emptyMsg =
    status === 'expiring_soon' ? t('expiry.emptyExpiringSoon') :
    status === 'expired'       ? t('expiry.emptyExpired')      :
                                 t('expiry.emptyAll');

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => changeStatus(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150',
                status === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {shops.length > 1 && (
          <select
            value={shopId}
            onChange={e => setShopId(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t('expiry.shopFilter')}</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <p className="text-xs font-semibold text-destructive flex-1">{error}</p>
          <button type="button" onClick={() => load(1)} className="text-xs text-primary hover:underline">
            {t('common.retry')}
          </button>
        </div>
      ) : batches.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-12">{emptyMsg}</p>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
              {[
                t('expiry.colProduct'),
                t('expiry.colSku'),
                t('expiry.colShop'),
                t('expiry.colBatch'),
                t('expiry.colQty'),
                t('expiry.colDays'),
              ].map((h, i) => (
                <span key={i} className="text-[11px] font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>

            {batches.map(batch => (
              <div
                key={batch.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-3 border-b border-border last:border-0 items-center"
              >
                <span className="text-[13px] font-medium truncate">{batch.product_name}</span>
                <span className="text-[12px] text-muted-foreground truncate">{batch.product_sku || '—'}</span>
                <span className="text-[12px] text-muted-foreground truncate">{batch.shop_name}</span>
                <span className="text-[12px] text-muted-foreground">{batch.batch_number || '—'}</span>
                <span className="text-[12px] text-muted-foreground">{batch.quantity}</span>
                <span className={cn(
                  'text-[12px] font-semibold',
                  batch.days_remaining < 0   ? 'text-destructive' :
                  batch.days_remaining <= 30 ? 'text-amber-600'   : 'text-success',
                )}>
                  {batch.days_remaining < 0
                    ? `${Math.abs(batch.days_remaining)}d ago`
                    : `${batch.days_remaining}d`}
                </span>
              </div>
            ))}
          </div>

          {batches.length < total && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-3 w-full py-2 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {loadingMore ? '…' : t('expiry.loadMore')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

**Note:** Remove the unused `hasMore` arrow function — the `batches.length < total` check is inlined directly in the JSX.

- [ ] **Step 2: Fix the hasMore line**

The plan above contains an erroneous line `const hasMore = items => items.length < total;` — remove it entirely. The load more button uses `batches.length < total` directly.

The corrected file should NOT have the `hasMore` variable. The load more button JSX reads:
```tsx
{batches.length < total && (
  <button type="button" onClick={loadMore} ...>
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add "admin/src/app/[locale]/(dashboard)/inventory/_components/ExpiryReport.tsx"
git commit -m "feat: ExpiryReport component for Expiry tab"
```

---

## Task 4: `VendorReport` component

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/VendorReport.tsx`

- [ ] **Step 1: Create `VendorReport.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/VendorReport.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  fetchVendorSummaryAction,
  type VendorSummaryParams,
} from '@/actions/inventory';
import type { Shop, VendorSummaryData } from '@/types/api';

interface Props {
  shops: Shop[];
}

export default function VendorReport({ shops }: Props) {
  const t = useTranslations('inventory');

  // Applied filters — trigger re-fetch when changed
  const [shopId,   setShopId]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // Pending filters — only applied on "Apply" click
  const [pendingShopId,   setPendingShopId]   = useState('');
  const [pendingDateFrom, setPendingDateFrom] = useState('');
  const [pendingDateTo,   setPendingDateTo]   = useState('');

  const [data,    setData]    = useState<VendorSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: VendorSummaryParams = {
      shop_id:   shopId   || undefined,
      date_from: dateFrom || undefined,
      date_to:   dateTo   || undefined,
    };
    const res = await fetchVendorSummaryAction(params);
    if (res.ok) setData(res.data);
    else        setError(res.error);
    setLoading(false);
  }, [shopId, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  function applyFilters() {
    setShopId(pendingShopId);
    setDateFrom(pendingDateFrom);
    setDateTo(pendingDateTo);
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {shops.length > 1 && (
          <select
            value={pendingShopId}
            onChange={e => setPendingShopId(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t('reports.shopFilter')}</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground shrink-0">{t('reports.dateFrom')}</label>
          <input
            type="date"
            value={pendingDateFrom}
            onChange={e => setPendingDateFrom(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground shrink-0">{t('reports.dateTo')}</label>
          <input
            type="date"
            value={pendingDateTo}
            onChange={e => setPendingDateTo(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button size="sm" onClick={applyFilters} disabled={loading}>
          {t('reports.apply')}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 rounded-xl bg-muted animate-pulse" />
            <div className="h-20 rounded-xl bg-muted animate-pulse" />
          </div>
          <div className="h-40 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <p className="text-xs font-semibold text-destructive flex-1">{error}</p>
          <button type="button" onClick={load} className="text-xs text-primary hover:underline">
            {t('common.retry')}
          </button>
        </div>
      ) : !data || data.vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-12">
          {t('reports.empty')}
        </p>
      ) : (
        <>
          {/* KPI mini-row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">{t('reports.totalTransactions')}</p>
              <p className="text-[26px] font-bold text-foreground tabular-nums mt-1">{data.total_transactions}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">{t('reports.totalUnits')}</p>
              <p className="text-[26px] font-bold text-foreground tabular-nums mt-1">{data.total_quantity}</p>
            </div>
          </div>

          {/* Vendor table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
              {[t('reports.colVendor'), t('reports.colTransactions'), t('reports.colTotalQty')].map((h, i) => (
                <span key={i} className="text-[11px] font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            {data.vendors.map(vendor => (
              <div
                key={vendor.vendor_id}
                className="grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-3 border-b border-border last:border-0 items-center"
              >
                <span className="text-[13px] font-semibold text-foreground truncate">{vendor.vendor_name}</span>
                <span className="text-[12px] text-muted-foreground">{vendor.transactions_count}</span>
                <span className="text-[12px] text-muted-foreground">{vendor.total_quantity}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add "admin/src/app/[locale]/(dashboard)/inventory/_components/VendorReport.tsx"
git commit -m "feat: VendorReport component for Reports tab"
```

---

## Task 5: Update `PremiumInventoryShell` — add 3 tabs + hint state

**Files:**
- Modify: `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumInventoryShell.tsx`

- [ ] **Step 1: Replace the full file content**

The current file (82 lines) needs to be replaced with:

```tsx
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
          {/* Low-stock restocking hint */}
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 3: Manual smoke test**

Start the dev server: `cd admin && npm run dev`

Open `http://localhost:3001/en/inventory` as an owner with the feature enabled.

- Tab bar now shows 6 tabs: Stock · Inbound · Vendors · Low Stock · Expiry · Reports
- On a narrow window, tab bar scrolls horizontally
- Low Stock tab loads and shows products below minimum stock
- Clicking "Receive" on a row switches to Inbound tab with hint banner
- Clicking ✕ on the hint dismisses it
- Expiry tab shows filter tabs (All / Expiring Soon / Expired) and data
- Reports tab shows date/shop filters; default load shows all vendors summary with KPI cards

- [ ] **Step 4: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add "admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumInventoryShell.tsx"
git commit -m "feat: add Low Stock, Expiry, Reports tabs to PremiumInventoryShell"
```

---

## Self-Review

### 1. Spec coverage

| Requirement | Task |
|---|---|
| 3 new tabs in shell (Low Stock, Expiry, Reports) | Task 5 |
| Tab bar scrolls on narrow screens | Task 5 — `overflow-x-auto` + `min-w-max` on inner div |
| Low Stock "Receive" switches to Inbound + hint banner | Task 5 — `handleReceive` + `lowStockHint` state |
| Hint banner dismissible with ✕ | Task 5 — `setLowStockHint(null)` on click |
| Low Stock table, color-coded qty, search, shop filter, load more | Task 2 |
| Expiry tab with All/Expiring Soon/Expired filter tabs | Task 3 |
| Expiry days color: red/amber/green | Task 3 |
| Reports KPI mini-cards + vendor table | Task 4 |
| Reports date range + shop filter with "Apply" | Task 4 — pending/applied state pattern |
| `fetchVendorSummaryAction` | Task 1 |
| All text i18n-keyed | Task 1 |
| Types `VendorSummaryItem`, `VendorSummaryData` | Task 1 |

### 2. Placeholder scan

Task 3 Step 1 contains an erroneous `const hasMore = items => ...` line — Step 2 explicitly instructs removing it. The actual JSX uses `batches.length < total` directly. No placeholder left in the final code.

### 3. Type consistency

- `LowStockList.onReceive(productName: string, quantity: string)` matches `handleReceive(productName, quantity)` in Task 5. ✅
- `VendorSummaryData.vendors` is `VendorSummaryItem[]` — used in Task 4 as `data.vendors.map(vendor => ...)` with `vendor.vendor_id`, `vendor.vendor_name`, `vendor.transactions_count`, `vendor.total_quantity`. ✅
- `fetchVendorSummaryAction` returns `VendorSummaryResult { ok, data: VendorSummaryData }` — consumed in Task 4 as `res.data`. ✅
- `ExpiryReportParams.status` accepts `'all' | 'expiring_soon' | 'expired'` — Task 3 `StatusFilter` type matches exactly. ✅
- `fetchStockLevelsAction` `shop` param used in Task 2 matches the action signature (`shop?: string`). ✅
