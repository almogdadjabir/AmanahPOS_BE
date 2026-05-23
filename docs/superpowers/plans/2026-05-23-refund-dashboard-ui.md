# Refund / Return Dashboard UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add partial-refund support to the admin dashboard: a click-through side drawer on each sale row, per-item quantity inputs, a confirm action that calls `POST /api/v1/sales/{id}/refund/`, and a KPI card showing today's refund totals.

**Architecture:** The server component `SalesRecentSection` fetches sales + user profile and passes `canRefund` + sales data to `SalesTableClient` (client component). `SalesTableClient` owns the selected-sale state and mounts `SaleDrawer`. The drawer handles view/refund/pending states and calls a server action on confirm. The sales summary KPI card gains a 4th "Today's Refunds" card after the backend adds `refund_count` + `total_refunds` to the summary endpoint.

**Tech Stack:** Django 5 / DRF (backend), Next.js 15 App Router, React 19 `useState`, next-intl, Tailwind CSS, existing `Drawer` + `Sheet` primitives from `components/ds/Drawer.tsx`.

---

## File Map

| Path | Action | Responsibility |
|---|---|---|
| `backend/apps/sales/views.py` | Modify | Add refund aggregates to `SalesSummaryView` |
| `backend/apps/sales/tests/test_sales_v2.py` | Modify | Test the new refund aggregate fields |
| `admin/src/types/api.ts` | Modify | Extend `SalesSummary`; add `RefundResult` type |
| `admin/src/actions/sales.ts` | Create | `refundSaleAction` server action |
| `admin/src/messages/en.json` | Modify | New keys under `sales.drawer` + `sales.refunds` |
| `admin/src/messages/ar.json` | Modify | Same keys in Arabic |
| `admin/src/app/[locale]/(dashboard)/sales/_components/SaleDrawer.tsx` | Create | Side drawer: detail view + refund mode |
| `admin/src/app/[locale]/(dashboard)/sales/_components/SalesTableClient.tsx` | Create | Client table wrapper with drawer state |
| `admin/src/app/[locale]/(dashboard)/sales/page.tsx` | Modify | KPI card + use `SalesTableClient` + unfence status filter |

---

## Task 1: Backend — refund aggregates in SalesSummaryView

**Files:**
- Modify: `backend/apps/sales/views.py` (around line 250, inside `SalesSummaryView.get`)
- Modify (test): `backend/apps/sales/tests/test_sales_v2.py`

- [ ] **Step 1: Write the failing test**

Add this class at the bottom of `backend/apps/sales/tests/test_sales_v2.py`:

```python
class TestSalesSummaryRefundFields(TestCase):
    """GET /api/v1/sales/summary/ must include refund_count and total_refunds."""

    def setUp(self):
        self.owner   = make_owner("+249900000099")
        self.biz     = make_business(self.owner)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        seed_stock(self.product, self.shop, qty=20)
        self.client  = make_auth_client(self.owner)

    def _direct_sale(self, status="completed"):
        sale = Sale.objects.create(
            tenant=self.biz,
            shop=self.shop,
            cashier=self.owner,
            receipt_number=f"REC-{uuid.uuid4().hex[:8]}",
            total_amount="600.00",
            net_amount="600.00",
            discount_amount="0",
            tax_amount="0",
            payment_method="cash",
            status=status,
        )
        SaleItem.objects.create(
            sale=sale,
            product=self.product,
            quantity="1",
            unit_price="600.00",
            discount="0",
            subtotal="600.00",
        )
        return sale

    def test_refund_fields_present_with_zero_refunds(self):
        self._direct_sale("completed")
        resp = self.client.get("/api/v1/sales/summary/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertIn("refund_count",  data)
        self.assertIn("total_refunds", data)
        self.assertEqual(data["refund_count"], 0)
        self.assertEqual(data["total_refunds"], "0")

    def test_refund_fields_count_refunded_and_partial(self):
        self._direct_sale("completed")
        self._direct_sale("refunded")
        self._direct_sale("partial_refund")
        resp = self.client.get("/api/v1/sales/summary/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertEqual(data["refund_count"], 2)
        self.assertAlmostEqual(float(data["total_refunds"]), 1200.0, places=1)
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
docker compose exec app python manage.py test apps.sales.tests.test_sales_v2.TestSalesSummaryRefundFields -v 2
```

Expected: FAIL — `AssertionError: 'refund_count' not found in {...}`

- [ ] **Step 3: Implement the backend change**

In `backend/apps/sales/views.py`, find the `SalesSummaryView.get` method. After the four `if` blocks that apply filters to `qs` (shop, date_from, date_to — ending around the `qs = qs.filter(created_at__date__lte=date_to)` line), insert this block:

```python
        # ── Refund aggregates (same date/shop window, different statuses) ─────
        refund_qs = Sale.objects.filter(
            tenant=tenant,
            status__in=[SaleStatus.REFUNDED, SaleStatus.PARTIAL_REFUND],
        )
        if shop_id:
            refund_qs = refund_qs.filter(shop_id=shop_id)
        if date_from:
            refund_qs = refund_qs.filter(created_at__date__gte=date_from)
        if date_to:
            refund_qs = refund_qs.filter(created_at__date__lte=date_to)

        refund_summary = refund_qs.aggregate(
            refund_count=Count("id"),
            total_refunds=Sum("net_amount"),
        )
```

Then in the `response_data` dict (just before the closing `}`), add:

```python
            "refund_count":  refund_summary["refund_count"]  or 0,
            "total_refunds": str(refund_summary["total_refunds"] or 0),
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
docker compose exec app python manage.py test apps.sales.tests.test_sales_v2.TestSalesSummaryRefundFields -v 2
```

Expected: 2 tests PASS

- [ ] **Step 5: Run the full sales test suite**

```bash
docker compose exec app python manage.py test apps.sales -v 2
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/apps/sales/views.py backend/apps/sales/tests/test_sales_v2.py
git commit -m "feat(sales): add refund_count + total_refunds to SalesSummaryView"
```

---

## Task 2: TypeScript types

**Files:**
- Modify: `admin/src/types/api.ts`

- [ ] **Step 1: Extend `SalesSummary` and add `RefundResult`**

Find the `SalesSummary` interface (currently ends after `avg_sale_value`). Add two fields:

```typescript
export interface SalesSummary {
  total_sales: number;
  total_revenue: string;
  total_discount: string;
  total_tax: string;
  avg_sale_value: string;
  refund_count: number;
  total_refunds: string;
}
```

Then, right after the closing `}` of `SalesSummary`, add:

```typescript
export interface RefundResult {
  refund_reference: string;
  refund_total: string;
  returned_items: {
    product_id: string;
    product_name: string;
    quantity: string;
    unit_price: string;
    subtotal: string;
  }[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add admin/src/types/api.ts
git commit -m "feat(dashboard): extend SalesSummary with refund fields, add RefundResult type"
```

---

## Task 3: Server action — refundSaleAction

**Files:**
- Create: `admin/src/actions/sales.ts`

- [ ] **Step 1: Create the file**

```typescript
'use server';

import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { extractApiError } from '@/lib/action-error';
import { CACHE_TAGS } from '@/lib/cacheTags';
import type { ApiResponse, RefundResult } from '@/types/api';

const API = () =>
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.amanapos.com';

async function authToken(): Promise<string> {
  return (await cookies()).get('auth_token')?.value ?? '';
}

export type RefundState =
  | { ok: true; refund_reference: string; refund_total: string }
  | { ok: false; error: string }
  | null;

export async function refundSaleAction(
  saleId: string,
  items: { product: string; quantity: number }[],
): Promise<RefundState> {
  try {
    const res = await fetch(`${API()}/api/v1/sales/${saleId}/refund/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: extractApiError(data, res.status, 'Refund failed. Please try again.') };
    }

    revalidateTag(CACHE_TAGS.sales);
    revalidateTag(CACHE_TAGS.salesSummary);

    const body = data as ApiResponse<RefundResult> & {
      refund_reference: string;
      refund_total: string;
    };
    return {
      ok: true,
      refund_reference: body.refund_reference,
      refund_total: body.refund_total,
    };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add admin/src/actions/sales.ts
git commit -m "feat(dashboard): add refundSaleAction server action"
```

---

## Task 4: i18n — add strings to en.json and ar.json

**Files:**
- Modify: `admin/src/messages/en.json`
- Modify: `admin/src/messages/ar.json`

- [ ] **Step 1: Add English strings**

In `admin/src/messages/en.json`, find the `"sales"` object. It currently ends with `"columns": { ... }`. Add the two new nested objects after `"columns"`:

```json
"drawer": {
  "title": "Sale Detail",
  "cashier": "Cashier",
  "method": "Payment Method",
  "unitPrice": "Unit price",
  "qty": "Qty",
  "subtotal": "Subtotal",
  "refundBtn": "Refund Items",
  "confirmRefund": "Confirm Refund",
  "cancel": "Cancel",
  "qtyLabel": "Return",
  "refundTotal": "Refund total"
},
"refunds": {
  "todayTitle": "Today's Refunds",
  "count": "refund",
  "counts": "refunds",
  "noRefunds": "No refunds today"
}
```

- [ ] **Step 2: Add Arabic strings**

In `admin/src/messages/ar.json`, find the `"sales"` object and add after `"columns"`:

```json
"drawer": {
  "title": "تفاصيل البيع",
  "cashier": "الكاشير",
  "method": "طريقة الدفع",
  "unitPrice": "سعر الوحدة",
  "qty": "الكمية",
  "subtotal": "المجموع الفرعي",
  "refundBtn": "استرداد عناصر",
  "confirmRefund": "تأكيد الاسترداد",
  "cancel": "إلغاء",
  "qtyLabel": "إرجاع",
  "refundTotal": "إجمالي الاسترداد"
},
"refunds": {
  "todayTitle": "مردودات اليوم",
  "count": "مرتجع",
  "counts": "مرتجعات",
  "noRefunds": "لا مردودات اليوم"
}
```

- [ ] **Step 3: Verify Next.js build compiles with no missing-key errors**

```bash
cd admin && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add admin/src/messages/en.json admin/src/messages/ar.json
git commit -m "feat(i18n): add sales drawer + refund strings (en + ar)"
```

---

## Task 5: SaleDrawer component

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/sales/_components/SaleDrawer.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Drawer from '@/components/ds/Drawer';
import Avatar from '@/components/ui/Avatar';
import { refundSaleAction } from '@/actions/sales';
import type { Sale } from '@/types/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  completed:      'bg-success/10 text-success',
  pending:        'bg-warning/10 text-warning',
  cancelled:      'bg-danger/10 text-danger',
  refunded:       'bg-info/10 text-info',
  partial_refund: 'bg-orange-100 text-orange-600',
};

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bankak: 'Bankak', card: 'Card',
  bank_transfer: 'Bank', mobile_wallet: 'Mobile',
  loyalty_points: 'Points', split: 'Split', credit: 'Credit',
};

// ── Public component ──────────────────────────────────────────────────────────

interface Props {
  sale:      Sale;
  canRefund: boolean;
  onClose:   () => void;
}

export default function SaleDrawer({ sale, canRefund, onClose }: Props) {
  const t = useTranslations('sales');
  return (
    <Drawer
      open
      onClose={onClose}
      title={t('drawer.title')}
      subtitle={sale.receipt_number}
    >
      {/* key={sale.id} resets all state when a different row is selected */}
      <DrawerContent key={sale.id} sale={sale} canRefund={canRefund} onClose={onClose} />
    </Drawer>
  );
}

// ── Inner stateful content ────────────────────────────────────────────────────

type Mode = 'view' | 'refund' | 'pending';

interface QtyEntry {
  product:      string;
  product_name: string;
  unit_price:   string;
  max:          number;
  qty:          number;
}

function DrawerContent({ sale, canRefund, onClose }: Props) {
  const t = useTranslations('sales');

  const [mode, setMode]   = useState<Mode>('view');
  const [error, setError] = useState<string | null>(null);
  const [qtys, setQtys]   = useState<QtyEntry[]>(() =>
    sale.items.map(item => ({
      product:      item.product,
      product_name: item.product_name,
      unit_price:   item.unit_price,
      max:          Math.round(parseFloat(item.quantity)),
      qty:          Math.round(parseFloat(item.quantity)),
    }))
  );

  const refundTotal = qtys.reduce(
    (sum, e) => sum + e.qty * parseFloat(e.unit_price),
    0,
  );
  const hasItems      = qtys.some(e => e.qty > 0);
  const isPending     = mode === 'pending';
  const canInitRefund = canRefund && (sale.status === 'completed' || sale.status === 'partial_refund');

  function setQty(idx: number, raw: string) {
    const v = Math.min(qtys[idx].max, Math.max(0, parseInt(raw, 10) || 0));
    setQtys(prev => prev.map((q, i) => i === idx ? { ...q, qty: v } : q));
  }

  async function handleConfirm() {
    const items = qtys
      .filter(e => e.qty > 0)
      .map(e => ({ product: e.product, quantity: e.qty }));

    setMode('pending');
    setError(null);

    const result = await refundSaleAction(sale.id, items);

    if (!result || !result.ok) {
      setError(result?.error ?? 'Refund failed.');
      setMode('refund');
    } else {
      onClose();
    }
  }

  const isRefundMode = mode === 'refund' || mode === 'pending';

  return (
    <div className="space-y-5">

      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar name={sale.cashier_name} size={28} />
          <div>
            <p className="text-[13px] font-semibold text-text-primary">{sale.cashier_name}</p>
            <p className="text-[11px] text-text-hint">{t('drawer.cashier')}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[sale.status] ?? 'bg-surface-muted text-text-hint'}`}>
          {sale.status.replace('_', ' ')}
        </span>
      </div>

      {/* ── Meta row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-text-hint mb-0.5">{t('drawer.method')}</p>
          <p className="text-[12px] font-semibold text-text-primary">
            {METHOD_LABEL[sale.payment_method] ?? sale.payment_method}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-hint mb-0.5">{t('columns.date')}</p>
          <p className="text-[12px] font-semibold text-text-primary">
            {new Date(sale.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* ── Items ───────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-black tracking-[.14em] uppercase text-text-hint mb-2">
          {t('drawer.items')} ({sale.item_count})
        </p>

        <div className="space-y-2">
          {!isRefundMode
            ? sale.items.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-surface-soft rounded-lg px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-text-primary truncate">{item.product_name}</p>
                    <p className="text-[11px] text-text-hint">
                      {item.unit_price} SDG × {item.quantity}
                    </p>
                  </div>
                  <p className="text-[13px] font-bold text-text-primary tabular-nums ms-3">
                    {item.subtotal}
                  </p>
                </div>
              ))
            : qtys.map((entry, idx) => (
                <div key={entry.product} className="flex items-center justify-between bg-surface-soft rounded-lg px-3 py-2.5 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-text-primary truncate">{entry.product_name}</p>
                    <p className="text-[11px] text-text-hint">
                      {entry.unit_price} SDG · max {entry.max}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <p className="text-[10px] text-text-hint">{t('drawer.qtyLabel')}</p>
                    <input
                      type="number"
                      dir="ltr"
                      min={0}
                      max={entry.max}
                      value={entry.qty}
                      disabled={isPending}
                      onChange={e => setQty(idx, e.target.value)}
                      className="w-14 text-center border border-border-soft rounded-md px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 bg-white"
                    />
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* ── Total row ───────────────────────────────────────────────────── */}
      <div className="border-t border-border-soft pt-3 flex items-center justify-between">
        <p className="text-[12px] text-text-hint">
          {isRefundMode ? t('drawer.refundTotal') : t('columns.amount')}
        </p>
        <p className="text-[16px] font-black text-text-primary tabular-nums">
          {isRefundMode
            ? refundTotal.toFixed(2)
            : parseFloat(sale.net_amount).toFixed(2)
          }
          <span className="text-[11px] font-normal text-text-hint ms-1">SDG</span>
        </p>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-danger/5 border border-danger/20 text-danger text-[12px] rounded-lg px-3 py-2.5">
          {error}
        </div>
      )}

      {/* ── CTA buttons ─────────────────────────────────────────────────── */}
      {mode === 'view' && canInitRefund && (
        <button
          onClick={() => setMode('refund')}
          className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors"
        >
          {t('drawer.refundBtn')}
        </button>
      )}

      {isRefundMode && (
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('view'); setError(null); }}
            disabled={isPending}
            className="flex-1 border border-border-soft text-text-secondary font-semibold text-[13px] py-2.5 rounded-xl hover:bg-surface-soft transition-colors disabled:opacity-50"
          >
            {t('drawer.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasItems || isPending}
            className="flex-1 bg-danger hover:bg-danger/90 active:bg-danger text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors disabled:opacity-40"
          >
            {isPending
              ? '…'
              : `${t('drawer.confirmRefund')} · ${refundTotal.toFixed(0)} SDG`
            }
          </button>
        </div>
      )}

    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add admin/src/app/\[locale\]/\(dashboard\)/sales/_components/SaleDrawer.tsx
git commit -m "feat(dashboard): add SaleDrawer component with partial refund support"
```

---

## Task 6: SalesTableClient component

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/sales/_components/SalesTableClient.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Avatar from '@/components/ui/Avatar';
import SaleDrawer from './SaleDrawer';
import type { Sale } from '@/types/api';

// ── Constants (mirrors existing sales/page.tsx constants) ─────────────────────

const STATUS_STYLE: Record<string, string> = {
  completed:      'bg-success/10 text-success',
  pending:        'bg-warning/10 text-warning',
  cancelled:      'bg-danger/10 text-danger',
  refunded:       'bg-info/10 text-info',
  partial_refund: 'bg-orange-100 text-orange-600',
};

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bankak: 'Bankak', card: 'Card',
  bank_transfer: 'Bank', mobile_wallet: 'Mobile',
  loyalty_points: 'Points', split: 'Split', credit: 'Credit',
};

const METHOD_TEXT: Record<string, string> = {
  cash:           'text-info',
  bankak:         'text-success',
  card:           'text-primary',
  bank_transfer:  'text-warning',
  mobile_wallet:  'text-purple-600',
  loyalty_points: 'text-orange-500',
  split:          'text-slate-500',
  credit:         'text-rose-500',
};

const METHOD_COLOR: Record<string, string> = {
  cash:           'bg-info/80',
  bankak:         'bg-success/80',
  card:           'bg-primary/80',
  bank_transfer:  'bg-warning/80',
  mobile_wallet:  'bg-purple-500/80',
  loyalty_points: 'bg-orange-400/80',
  split:          'bg-slate-400/80',
  credit:         'bg-rose-400/80',
};

function fmtMoney(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  sales:     Sale[];
  canRefund: boolean;
}

export default function SalesTableClient({ sales, canRefund }: Props) {
  const t = useTranslations('sales');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  return (
    <>
      {selectedSale && (
        <SaleDrawer
          sale={selectedSale}
          canRefund={canRefund}
          onClose={() => setSelectedSale(null)}
        />
      )}

      <div className="bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
          <p className="text-[13px] font-bold text-text-primary">{t('recentTitle')}</p>
          <span className="text-[11px] text-text-hint">
            {sales.length} {t('noData')}
          </span>
        </div>

        {sales.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[13px] text-text-hint">{t('noTransactions')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-soft">
                  {[
                    t('columns.receipt'),
                    t('columns.cashier'),
                    t('columns.method'),
                    t('columns.status'),
                    t('columns.items'),
                    t('columns.amount'),
                    t('columns.date'),
                  ].map(h => (
                    <th
                      key={h}
                      className="text-start px-4 py-2.5 text-[10px] font-black tracking-[.14em] uppercase text-text-hint last:text-end whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => {
                  const date = new Date(sale.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  });
                  return (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedSale(sale)}
                      className="border-b border-border-soft/60 hover:bg-surface-soft transition-colors last:border-0 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-text-hint whitespace-nowrap">
                        {sale.receipt_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={sale.cashier_name} size={22} />
                          <span className="text-[12px] text-text-primary whitespace-nowrap">
                            {sale.cashier_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${METHOD_TEXT[sale.payment_method] ?? 'text-text-secondary'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${METHOD_COLOR[sale.payment_method] ?? 'bg-slate-300'}`} />
                          {METHOD_LABEL[sale.payment_method] ?? sale.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[sale.status] ?? 'bg-surface-muted text-text-hint'}`}>
                          {sale.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-text-secondary">
                        {sale.item_count}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-bold text-text-primary tabular-nums">
                          {fmtMoney(parseFloat(sale.net_amount))}
                          <span className="text-[10px] font-normal text-text-hint ms-1">SDG</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-text-hint text-end whitespace-nowrap">
                        {date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add admin/src/app/\[locale\]/\(dashboard\)/sales/_components/SalesTableClient.tsx
git commit -m "feat(dashboard): add SalesTableClient with drawer state management"
```

---

## Task 7: Update sales/page.tsx

**Files:**
- Modify: `admin/src/app/[locale]/(dashboard)/sales/page.tsx`

This task makes two separate changes: (A) add the refund KPI card to `SalesSummarySection`, and (B) refactor `SalesRecentSection` to use `SalesTableClient`.

### Change A: Refund KPI card in SalesSummarySection

- [ ] **Step 1: Update the grid class and add the 4th card**

In `SalesSummarySection`, find the `<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">` opening tag and change it to:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

Then, after the closing `</div>` of the Bankak card (the third `<div className="relative overflow-hidden bg-white ...`), add this 4th card:

```tsx
      {/* Today's refunds */}
      <div className="bg-white rounded-2xl border border-orange-100 shadow-[0_1px_4px_0_rgb(0_0_0/.05)] p-5">
        <p className="text-[10px] font-black tracking-[.18em] uppercase text-orange-500 mb-3">
          {t('refunds.todayTitle')}
        </p>
        <p className="text-[32px] font-black text-text-primary leading-none tabular-nums">
          {fmtMoney(parseFloat(todayData?.total_refunds ?? '0'))}
          <span className="text-[14px] font-semibold text-text-hint ml-1.5">SDG</span>
        </p>
        <p className="text-[12px] text-text-hint mt-2">
          {(todayData?.refund_count ?? 0) === 0
            ? t('refunds.noRefunds')
            : `${todayData?.refund_count} ${
                todayData?.refund_count === 1
                  ? t('refunds.count')
                  : t('refunds.counts')
              }`
          }
        </p>
      </div>
```

### Change B: Replace inline table with SalesTableClient

- [ ] **Step 2: Add imports at the top of the file**

After the existing imports block, add:

```typescript
import SalesTableClient from './_components/SalesTableClient';
import { fetchUserProfile } from '@/services/owner';
```

- [ ] **Step 3: Update `SalesRecentSection`**

The current `SalesRecentSection` function starts with:

```typescript
async function SalesRecentSection({ shopId }: { shopId?: string }) {
  const t = await getTranslations('sales');
  const recentRes = await _recentSales(shopId);
  const recent = recentRes?.results ?? [];
```

Replace with:

```typescript
async function SalesRecentSection({ shopId }: { shopId?: string }) {
  const [recentRes, profileRes] = await Promise.all([
    _recentSales(shopId),
    fetchUserProfile(),
  ]);
  const recent    = recentRes?.results ?? [];
  const canRefund = profileRes?.data?.role === 'owner' || profileRes?.data?.is_staff === true;
```

- [ ] **Step 4: Replace the table JSX with SalesTableClient**

Delete everything from `return (` down to the end of `SalesRecentSection` and replace with:

```tsx
  return (
    <SalesTableClient sales={recent} canRefund={canRefund} />
  );
}
```

- [ ] **Step 5: Update `_recentSales` to include all non-cancelled statuses**

Find the `_recentSales` cache function:

```typescript
const _recentSales = cache(async (shopId: string | undefined) =>
  withUserCache(
    (tok) => apiGet<ApiList<Sale>>('/api/v1/sales/', {
      status: 'completed', limit: 15, page: 1, shop: shopId,
    }, { token: tok }),
    [CACHE_TAGS.sales, 'sp-recent', shopId ?? ''],
    15,
  )
);
```

Remove `status: 'completed'` so all recent sales (including refunded ones) are shown:

```typescript
const _recentSales = cache(async (shopId: string | undefined) =>
  withUserCache(
    (tok) => apiGet<ApiList<Sale>>('/api/v1/sales/', {
      limit: 15, page: 1, shop: shopId,
    }, { token: tok }),
    [CACHE_TAGS.sales, 'sp-recent', shopId ?? ''],
    15,
  )
);
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 7: Start dev server and test manually**

```bash
make up
```

Then open http://localhost:8080 (Nginx → :3001) in a browser.

Test the happy path:
1. Log in as an owner
2. Navigate to `/en/sales`
3. Verify 4 KPI cards appear (Today, This Month, Bankak, Today's Refunds)
4. Click any completed sale row → drawer opens with items
5. Click "Refund Items" → quantity inputs appear
6. Reduce one item qty to 0 → refund total updates
7. Click "Confirm Refund" → drawer closes, table refreshes, sale shows "refunded" badge

Test error path:
8. Try to refund an already-refunded sale → drawer should NOT show the Refund Items button (status is "refunded")

Test role gating:
9. Log in as a manager (non-owner, non-staff) → click a sale row → drawer opens but no "Refund Items" button

- [ ] **Step 8: Commit**

```bash
git add admin/src/app/\[locale\]/\(dashboard\)/sales/page.tsx
git commit -m "feat(dashboard): add refund KPI card and wire SalesTableClient to sales page"
```

---

## Done

All 7 tasks complete. The feature is fully implemented:
- `POST /api/v1/sales/{id}/refund/` is called from the admin dashboard
- Partial refunds supported via per-item quantity inputs
- Only owners and staff see the refund button
- Today's refund totals visible in the KPI card
- Arabic RTL supported via `ms-*` / `text-start` / `text-end` utilities
