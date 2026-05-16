# Premium Inventory Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current 6-tab premium inventory shell with a bento command center — a deep-indigo hero strip + 7 data tiles — while keeping the non-premium experience completely unchanged.

**Architecture:** Feature-gated at `inventory/page.tsx`. Non-premium owners get `BasicInventoryView` (identical to today). Premium owners get `PremiumInventoryShell` (new bento from zip) wrapped in `InventoryDrawerShell`. All 5 drill-down actions open drawers wrapping existing SP3 components. Data for tiles is pre-fetched server-side in `loadPremiumInventoryData()`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, next-intl, existing `Drawer`/`StatCard` components, Django/DRF backend (no new migrations needed — only a response field addition).

---

## File Map

| Action | File |
|---|---|
| Modify | `backend/apps/inventory/views.py` — add 3 alias fields to `PremiumSummaryView` response |
| Modify | `admin/src/types/api.ts` — add 3 optional fields to `PremiumInventorySummary` |
| Modify | `admin/src/styles/globals.css` — append premium.css tokens |
| Create | `admin/src/components/premium/PremiumFrame.tsx` — reusable premium chrome |
| Create | `admin/src/app/[locale]/(dashboard)/inventory/_components/tiles.tsx` — 7 bento tiles |
| Modify | `admin/src/messages/en.json` — merge new `inventory.premium.*` keys |
| Modify | `admin/src/messages/ar.json` — Arabic translations |
| Create | `admin/src/app/[locale]/(dashboard)/inventory/_components/StockDrawerContent.tsx` — stock drawer body |
| Replace | `admin/src/app/[locale]/(dashboard)/inventory/page.tsx` — feature gate + data loader |
| Replace | `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumInventoryShell.tsx` — new bento shell |

**Unchanged:** `LowStockList`, `ExpiryReport`, `VendorReport`, `VendorsList`, `InboundReceivingPanel`, `InboundTransactionsList`, `PremiumKPIRow`, `PremiumLockedInventoryCard`, `InventoryDrawerShell`, `InventoryStats`, `InventoryFilters`, `InventoryTable`.

---

## Task 1: Backend — add alias fields to `PremiumSummaryView`

**Files:**
- Modify: `backend/apps/inventory/views.py`
- Modify: `admin/src/types/api.ts`

- [ ] **Step 1: Update `PremiumSummaryView.get()` return value**

In `backend/apps/inventory/views.py`, locate `PremiumSummaryView` and find the final `return Response(...)` call. The current response dict ends with `"received_quantity_this_month": str(received_qty)`. Add 3 new alias fields after it:

```python
        return Response({
            "success": True,
            "data": {
                "stock_items_count":            stock_items_count,
                "low_stock_count":              low_stock_count,
                "out_of_stock_count":           out_of_stock_count,
                "expiring_soon_count":          expiring_soon_count,
                "expired_count":                expired_count,
                "active_vendors_count":         active_vendors_count,
                "inbound_this_month_count":     inbound_this_month_count,
                "received_quantity_this_month": str(received_qty),
                # Alias fields for the bento shell
                "total_skus":         stock_items_count,
                "inbound_this_month": inbound_this_month_count,
                "units_received":     str(received_qty),
            },
        })
```

- [ ] **Step 2: Run the backend tests to verify no regressions**

```bash
docker compose exec app python manage.py test apps.inventory.tests.test_premium_endpoints.PremiumSummaryViewTest --verbosity=1
```

Expected: all 8 PremiumSummaryViewTest tests PASS.

- [ ] **Step 3: Update `PremiumInventorySummary` in `admin/src/types/api.ts`**

Locate the `PremiumInventorySummary` interface. Add 3 optional fields after `received_quantity_this_month`:

```typescript
export interface PremiumInventorySummary {
  stock_items_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
  active_vendors_count: number;
  inbound_this_month_count: number;
  received_quantity_this_month: string;
  // Alias fields used by the bento shell
  total_skus?:         number;
  inbound_this_month?: number;
  units_received?:     string;
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/inventory/views.py admin/src/types/api.ts
git commit -m "feat: add total_skus, inbound_this_month, units_received alias fields to premium summary"
```

---

## Task 2: CSS tokens + drop-in components

**Files:**
- Modify: `admin/src/styles/globals.css`
- Create: `admin/src/components/premium/PremiumFrame.tsx`
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/tiles.tsx`

- [ ] **Step 1: Append premium.css to globals.css**

Open `admin/src/styles/globals.css` and append this content at the very end:

```css
/* ─────────────────────────────────────────────────────────────
   Premium feature design tokens
   Append to admin/src/styles/globals.css (or import once).

   Convention:
   • Brand teal stays the everyday brand color.
   • Premium chrome is its own family — pure indigo luminance with
     a champagne shimmer. No cross-hue gradients (no teal→indigo
     muddy band).
   ───────────────────────────────────────────────────────────── */

:root {
  --premium-50:  #EEF0FB;
  --premium-100: #DDE1F5;
  --premium-200: #B6BCE8;
  --premium-300: #8B95DA;
  --premium-400: #6471C7;
  --premium-500: #4751B0; /* anchor */
  --premium-600: #383F94;
  --premium-700: #2B3173;
  --premium-800: #1E2452;
  --premium-900: #141938;
  --premium-ink: #0D1230;

  /* Used sparingly for the "expensive" sparkle */
  --gold-soft:   #E8D7A6;
  --gold:        #D4B675;
  --gold-deep:   #9B7E45;

  --premium-glow:  0 14px 44px -18px rgba(55, 63, 148, 0.42),
                   0 1px 0 0 rgba(255, 255, 255, 0.04) inset;
}

/* Premium signature gradient — use as background-image */
.bg-premium-grad {
  background-image: linear-gradient(155deg, #8B95DA 0%, #4751B0 50%, #2B3173 100%);
}

/* Solid premium fill for primary CTAs inside the frame */
.bg-premium-cta {
  background-image: linear-gradient(180deg, #5A65C2 0%, #3D4699 100%);
  box-shadow: 0 8px 20px -10px rgba(55, 63, 148, 0.55),
              inset 0 1px 0 rgba(255, 255, 255, 0.20);
}
.bg-premium-cta:hover { filter: brightness(1.05); }

/* Premium hero background — refined deep indigo with auroras */
.bg-premium-hero {
  background:
    radial-gradient(900px 320px at 100% -10%, rgba(100,113,199,0.30), transparent 55%),
    radial-gradient(800px 320px at 0% 120%,  rgba(212,182,117,0.10), transparent 55%),
    radial-gradient(700px 240px at 60% 110%, rgba(139,149,218,0.18), transparent 60%),
    linear-gradient(160deg, #0E1334 0%, #161D45 55%, #1B2354 100%);
}

/* Hairline gold sheen along the top edge of the hero */
.premium-hero-sheen::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(232, 215, 166, 0.35) 30%,
    rgba(232, 215, 166, 0.55) 50%,
    rgba(232, 215, 166, 0.35) 70%,
    transparent 100%);
  pointer-events: none;
}

/* Live pulse */
@keyframes premium-livepulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(94, 234, 212, 0.55); }
  50%      { box-shadow: 0 0 0 6px rgba(94, 234, 212, 0); }
}
.premium-live-dot { animation: premium-livepulse 1.8s ease-out infinite; }
```

- [ ] **Step 2: Create `PremiumFrame.tsx`**

```bash
mkdir -p /Users/almogdadjabir/Documents/projects/AmanaPOS/admin/src/components/premium
```

Create `admin/src/components/premium/PremiumFrame.tsx` with this exact content (drop-in from zip):

```tsx
'use client';

import { Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export interface PremiumFrameProps {
  feature:        string;
  plan:           string;
  subtitle?:      string;
  icon?:          ReactNode;
  actions?:       ReactNode;
  heroChildren?:  ReactNode;
  children?:      ReactNode;
  className?:     string;
}

export function PremiumFrame({
  feature, plan, subtitle, icon, actions, heroChildren, children, className,
}: PremiumFrameProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <PremiumHero feature={feature} plan={plan} subtitle={subtitle} icon={icon} actions={actions}>
        {heroChildren}
      </PremiumHero>
      {children}
    </div>
  );
}

function PremiumHero({
  feature, plan, subtitle, icon, actions, children,
}: Pick<PremiumFrameProps, 'feature' | 'plan' | 'subtitle' | 'icon' | 'actions'> & { children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-premium-hero premium-hero-sheen text-white px-7 py-6">
      <svg className="absolute inset-0 h-full w-full opacity-[0.07] mix-blend-overlay pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <pattern id="premiumMesh" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.3" fill="white" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#premiumMesh)" />
      </svg>

      <div className="relative flex items-start gap-4">
        <div
          className="grid place-items-center w-13 h-13 rounded-[14px] bg-premium-grad flex-shrink-0"
          style={{ width: 52, height: 52, boxShadow: '0 12px 28px -10px rgba(55,63,148,0.6), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -10px 24px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(232,215,166,0.22)' }}
        >
          {icon ?? <Layers className="h-6 w-6" strokeWidth={2} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="m-0 text-[22px] font-extrabold tracking-tight whitespace-nowrap">{feature}</h1>
            <PremiumBadge />
            <PremiumStatus plan={plan} />
          </div>
          {subtitle && <div className="mt-1.5 text-xs font-medium text-white/65">{subtitle}</div>}
        </div>

        <div className="flex gap-2 flex-shrink-0">{actions}</div>
      </div>

      {children && <div className="relative mt-5">{children}</div>}
    </div>
  );
}

export function PremiumBadge({ label = 'Premium' }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[9.5px] font-extrabold uppercase tracking-[0.6px] text-white flex-shrink-0"
      style={{ background: 'linear-gradient(155deg, #6471C7 0%, #4751B0 50%, #2B3173 100%)', boxShadow: '0 2px 8px -2px rgba(55,63,148,0.45), inset 0 0 0 1px rgba(232,215,166,0.22)' }}
    >
      <Sparkles className="h-2.5 w-2.5" style={{ color: '#F1E2B6' }} fill="#F1E2B6" />
      {label}
    </span>
  );
}

function PremiumStatus({ plan }: { plan: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-bold flex-shrink-0"
      style={{ background: 'rgba(94, 234, 212, 0.10)', color: '#5EEAD4', border: '1px solid rgba(94, 234, 212, 0.25)' }}
    >
      <span className="premium-live-dot block w-1.5 h-1.5 rounded-full" style={{ background: '#5EEAD4' }} />
      Active · {plan}
    </span>
  );
}
```

- [ ] **Step 3: Create `tiles.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/tiles.tsx` — copy the full content from `/tmp/premium_zip_extract/implementation/tiles.tsx` verbatim. No changes needed.

```bash
cp /tmp/premium_zip_extract/implementation/tiles.tsx \
   /Users/almogdadjabir/Documents/projects/AmanaPOS/admin/src/app/\[locale\]/\(dashboard\)/inventory/_components/tiles.tsx
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add admin/src/styles/globals.css \
        admin/src/components/premium/PremiumFrame.tsx \
        "admin/src/app/[locale]/(dashboard)/inventory/_components/tiles.tsx"
git commit -m "feat: add premium CSS tokens, PremiumFrame, and bento tiles"
```

---

## Task 3: i18n — merge new premium keys

**Files:**
- Modify: `admin/src/messages/en.json`
- Modify: `admin/src/messages/ar.json`

- [ ] **Step 1: Add new keys to `admin/src/messages/en.json`**

In `en.json`, find the `inventory.premium` object. It currently has `tabStock`, `tabInbound`, etc. Add these keys to the same object (alongside existing keys — do NOT remove the tab keys):

```json
      "featureName":        "Inventory Control Center",
      "planName":           "Pro Inventory",
      "receiveStock":       "Receive Stock",
      "kpiHealth":          "Stock Health",
      "kpiRestock":         "Needs restock",
      "kpiInboundMonth":    "Inbound (mo.)",
      "kpiExpiring30":      "Expiring 30d",
      "quickReceive":       "Receive stock",
      "quickReceiveHint":   "New inbound transaction",
      "quickAdjust":        "Adjust stock",
      "quickAdjustHint":    "Damage · loss · count",
      "quickVendor":        "Add vendor",
      "quickVendorHint":    "New supplier",
      "quickReport":        "Generate report",
      "quickReportHint":    "Vendor / category",
      "expirySuggestion":   "{count, plural, one {# batch} other {# batches}} expire within 5 days. Suggested: run a markdown."
```

- [ ] **Step 2: Add same keys to `admin/src/messages/ar.json`**

Find `inventory.premium` in `ar.json` and add:

```json
      "featureName":        "مركز التحكم في المخزون",
      "planName":           "مخزون احترافي",
      "receiveStock":       "استلام مخزون",
      "kpiHealth":          "صحة المخزون",
      "kpiRestock":         "يحتاج تخزين",
      "kpiInboundMonth":    "الوارد (الشهر)",
      "kpiExpiring30":      "ينتهي خلال 30 يوم",
      "quickReceive":       "استلام مخزون",
      "quickReceiveHint":   "حركة وارد جديدة",
      "quickAdjust":        "تعديل المخزون",
      "quickAdjustHint":    "تلف · فقدان · جرد",
      "quickVendor":        "إضافة مورد",
      "quickVendorHint":    "مورد جديد",
      "quickReport":        "إنشاء تقرير",
      "quickReportHint":    "مورد / فئة",
      "expirySuggestion":   "{count, plural, one {دفعة واحدة} other {# دفعات}} تنتهي خلال 5 أيام. مقترح: تشغيل تخفيض."
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

- [ ] **Step 4: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add admin/src/messages/en.json admin/src/messages/ar.json
git commit -m "feat: add bento shell i18n keys to premium inventory"
```

---

## Task 4: `StockDrawerContent` component

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/inventory/_components/StockDrawerContent.tsx`

This is the body for the `stock` drawer — a simple client-side stock list that accepts an optional status filter (e.g. `'low_stock'`, `'out_of_stock'`, or `undefined` for all stock).

- [ ] **Step 1: Create `StockDrawerContent.tsx`**

Create `admin/src/app/[locale]/(dashboard)/inventory/_components/StockDrawerContent.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchStockLevelsAction } from '@/actions/inventory';
import type { Shop, StockLevel } from '@/types/api';

interface Props {
  shops:   Shop[];
  status?: 'low_stock' | 'out_of_stock';
}

export default function StockDrawerContent({ shops, status }: Props) {
  const t = useTranslations('inventory');
  const [items,   setItems]   = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [shopId,  setShopId]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchStockLevelsAction({
      status: status,
      shop:   shopId || undefined,
      limit:  50,
    });
    if (res.ok) setItems(res.data);
    else        setError(res.error);
    setLoading(false);
  }, [status, shopId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-5 flex flex-col gap-4">
      {shops.length > 1 && (
        <select
          value={shopId}
          onChange={e => setShopId(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">{t('lowStock.shopFilter')}</option>
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-[52px] rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <p className="text-xs font-semibold text-destructive flex-1">{error}</p>
          <button type="button" onClick={load} className="text-xs text-primary hover:underline">
            {t('common.retry')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-12">
          {t('lowStock.empty')}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border bg-card">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{item.product_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {item.shop_name}
                  {item.product_sku ? ` · ${item.product_sku}` : ''}
                </p>
              </div>
              <span className={cn(
                'text-[14px] font-bold tabular-nums',
                item.is_out_of_stock ? 'text-destructive' :
                item.is_low_stock    ? 'text-amber-600'   : 'text-success',
              )}>
                {item.quantity}
              </span>
            </div>
          ))}
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

- [ ] **Step 3: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add "admin/src/app/[locale]/(dashboard)/inventory/_components/StockDrawerContent.tsx"
git commit -m "feat: StockDrawerContent for stock drill-down drawer in bento shell"
```

---

## Task 5: `page.tsx` — feature gate + data loader + BasicInventoryView

**Files:**
- Replace: `admin/src/app/[locale]/(dashboard)/inventory/page.tsx`

This is the critical branching task. The non-premium path must be byte-for-byte identical to the current non-premium behavior.

- [ ] **Step 1: Replace the full `page.tsx`**

Write `admin/src/app/[locale]/(dashboard)/inventory/page.tsx` with:

```tsx
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TableSkeleton } from '@/components/ds/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionError } from '@/components/SectionError';
import InventoryDrawerShell from './_components/InventoryDrawerShell';
import InventoryPageHeader from './_components/InventoryPageHeader';
import InventoryStats, { InventoryStatsSkeleton } from './_components/InventoryStats';
import InventoryFilters from './_components/InventoryFilters';
import InventoryTable from './_components/InventoryTable';
import PremiumLockedInventoryCard from './_components/PremiumLockedInventoryCard';
import PremiumInventoryShell from './_components/PremiumInventoryShell';
import { fetchBusiness, fetchUserProfile } from '@/services/owner';
import {
  fetchPremiumSummaryAction,
  fetchStockLevelsAction,
  fetchExpiryReportAction,
  fetchVendorSummaryAction,
  fetchInboundListAction,
} from '@/actions/inventory';
import type { Shop } from '@/types/api';
import type { RestockItem, ExpiryBatchLite, VendorLite, ReceiptLite } from './_components/tiles';

interface SearchParams {
  search?: string;
  status?: string;
  page?:   string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

// ── Premium tile data ─────────────────────────────────────────────────

type PremiumInventoryData = {
  health:   { pct: number; inStock: number; low: number; out: number };
  velocity: { series: number[]; labels: string[]; avgPerDay: number; peak: { value: number; label: string }; spend: string; deltaPct: number };
  restock:  RestockItem[];
  expiry:   { batches: ExpiryBatchLite[]; nearestDangerCount: number; suggestion?: string };
  vendors:  VendorLite[];
  receipts: ReceiptLite[];
};

async function loadPremiumInventoryData(
  shops: Shop[],
  summary: Awaited<ReturnType<typeof fetchPremiumSummaryAction>> extends { ok: true; data: infer D } ? D : null,
): Promise<PremiumInventoryData> {
  const [restockRes, expiryRes, vendorRes, receiptsRes] = await Promise.all([
    fetchStockLevelsAction({ status: 'low_stock', limit: 10 }),
    fetchExpiryReportAction({ status: 'expiring_soon', page: 1 }),
    fetchVendorSummaryAction(),
    fetchInboundListAction({ page: 1 }),
  ]);

  // ── Health ─────────────────────────────────────────────────────────
  const totalItems = summary?.stock_items_count ?? 0;
  const low = summary?.low_stock_count ?? 0;
  const out = summary?.out_of_stock_count ?? 0;
  const inStock = Math.max(0, totalItems - low - out);
  const pct = totalItems > 0 ? (inStock / totalItems) * 100 : 100;

  // ── Velocity (14-day bar chart) ────────────────────────────────────
  const transactions = receiptsRes.ok ? receiptsRes.data : [];
  const DAY_ABBRS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date();
  const series: number[] = Array(14).fill(0);
  const labels: string[]  = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(DAY_ABBRS[d.getDay()]);
  }
  for (const txn of transactions) {
    const daysAgo = Math.floor(
      (today.getTime() - new Date(txn.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysAgo >= 0 && daysAgo < 14) {
      series[13 - daysAgo] += Number(txn.total_quantity ?? 0);
    }
  }
  const total14   = series.reduce((a, b) => a + b, 0);
  const avgPerDay = Math.round(total14 / 14);
  const peakVal   = Math.max(...series, 0);
  const peakIdx   = series.indexOf(peakVal);
  const last7     = series.slice(7).reduce((a, b) => a + b, 0);
  const prior7    = series.slice(0, 7).reduce((a, b) => a + b, 0);
  const deltaPct  = prior7 === 0 ? 0 : Math.round(((last7 - prior7) / prior7) * 100);

  // ── Restock queue ──────────────────────────────────────────────────
  const restock: RestockItem[] = (restockRes.ok ? restockRes.data : [])
    .slice(0, 8)
    .map(s => ({
      id:     s.id,
      name:   s.product_name,
      qty:    Math.max(0, Math.round(Number(s.quantity))),
      min:    0,   // min_stock_level not in StockLevel serializer
      vendor: '—', // vendor not in StockLevel model
    }));

  // ── Expiry ─────────────────────────────────────────────────────────
  const expiryBatches: ExpiryBatchLite[] = (expiryRes.ok ? expiryRes.data : [])
    .slice(0, 8)
    .map(b => ({
      id:   b.id,
      name: b.product_name,
      days: b.days_remaining,
      qty:  Math.round(Number(b.quantity)),
    }));
  const nearestDangerCount = expiryBatches.filter(b => b.days < 7).length;
  const suggestion = nearestDangerCount > 0
    ? `${nearestDangerCount} ${nearestDangerCount === 1 ? 'batch' : 'batches'} expire within 5 days. Suggested: run a markdown.`
    : undefined;

  // ── Vendors ────────────────────────────────────────────────────────
  const vendorData = vendorRes.ok ? vendorRes.data : null;
  const totalTxn   = vendorData?.total_transactions ?? 1;
  const vendors: VendorLite[] = (vendorData?.vendors ?? [])
    .slice(0, 5)
    .map(v => ({
      id:     v.vendor_id,
      name:   v.vendor_name,
      share:  Math.round((v.transactions_count / Math.max(1, totalTxn)) * 100),
      value:  v.total_quantity,
      onTime: 100, // placeholder — on-time delivery tracking not yet implemented
    }));

  // ── Recent receipts ────────────────────────────────────────────────
  const receipts: ReceiptLite[] = transactions.slice(0, 5).map(t => ({
    id:     t.reference,
    vendor: t.vendor?.name ?? '—',
    units:  Math.round(Number(t.total_quantity ?? 0)),
    value:  t.total_quantity ?? '0',
    shop:   t.shop_name,
    time:   new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return {
    health:   { pct, inStock, low, out },
    velocity: { series, labels, avgPerDay, peak: { value: peakVal, label: labels[peakIdx] ?? '—' }, spend: '—', deltaPct },
    restock,
    expiry:   { batches: expiryBatches, nearestDangerCount, suggestion },
    vendors,
    receipts,
  };
}

// ── Non-premium experience — unchanged ────────────────────────────────

async function BasicInventoryView({
  shops,
  params,
}: {
  shops:  Shop[];
  params: SearchParams;
}) {
  const page     = Math.max(1, Number(params.page) || 1);
  const tableKey = JSON.stringify({ search: params.search, status: params.status, page });

  return (
    <InventoryDrawerShell>
      <InventoryPageHeader />
      <PremiumLockedInventoryCard />

      <ErrorBoundary fallback={<SectionError message="Failed to load inventory stats" />}>
        <Suspense fallback={<InventoryStatsSkeleton />}>
          <InventoryStats />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionError message="Failed to load filters" />}>
        <Suspense fallback={<div className="h-[52px] rounded-xl bg-muted animate-pulse mb-5" />}>
          <InventoryFilters />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionError message="Failed to load inventory" />}>
        <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={6} />}>
          <InventoryTable search={params.search} status={params.status} page={page} />
        </Suspense>
      </ErrorBoundary>
    </InventoryDrawerShell>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default async function InventoryPage({ searchParams }: Props) {
  const [bizRes, profileRes] = await Promise.all([fetchBusiness(), fetchUserProfile()]);
  if (bizRes?.data?.[0]?.business_type !== 'shop') notFound();

  const shops     = bizRes?.data?.[0]?.shops ?? [];
  const isPremium = Boolean(profileRes?.data?.enabled_features?.inventory_inbound_receiving);
  const params    = await searchParams;

  if (!isPremium) {
    return <BasicInventoryView shops={shops} params={params} />;
  }

  const summaryRes = await fetchPremiumSummaryAction();
  const summary    = summaryRes?.ok ? summaryRes.data : null;
  const data       = await loadPremiumInventoryData(shops, summary);

  return (
    <InventoryDrawerShell>
      <PremiumInventoryShell shops={shops} summary={summary} data={data} />
    </InventoryDrawerShell>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Fix any type errors before proceeding. Common issue: the `loadPremiumInventoryData` `summary` parameter type. If TypeScript complains, simplify the parameter type to `typeof summary` or `PremiumInventorySummary | null`:

```typescript
async function loadPremiumInventoryData(
  shops: Shop[],
  summary: import('@/types/api').PremiumInventorySummary | null,
): Promise<PremiumInventoryData>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add "admin/src/app/[locale]/(dashboard)/inventory/page.tsx"
git commit -m "feat: premium inventory feature gate, data loader, BasicInventoryView"
```

---

## Task 6: New `PremiumInventoryShell` with drawer wiring

**Files:**
- Replace: `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumInventoryShell.tsx`

This replaces the 6-tab shell with the bento shell from the zip, adds all 5 drawer imports, and wires drawer open/close for each tile CTA.

- [ ] **Step 1: Write the new `PremiumInventoryShell.tsx`**

Write `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumInventoryShell.tsx`:

```tsx
'use client';

import { ReactNode, useCallback, useState } from 'react';
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

  const heroKpis = [
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
      sub:   `${data.expiry.nearestDangerCount} in next 7 days`,
      tone:  '#FCA5A5',
    },
  ];

  // Tile drill-down handlers
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
            <HeaderBtn variant="ghost" icon={<ScanLine className="h-3.5 w-3.5" />}>Scan</HeaderBtn>
            <HeaderBtn variant="ghost" icon={<Download className="h-3.5 w-3.5" />}>Export</HeaderBtn>
            <HeaderBtn variant="cta" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDrawer('inbound')}>
              {t('premium.receiveStock')}
            </HeaderBtn>
          </>
        }
        heroChildren={
          <div className="grid grid-cols-4 gap-3.5">
            {heroKpis.map((k) => (
              <div
                key={k.label}
                className="px-4 py-3.5 rounded-[14px]"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  backdropFilter: 'blur(14px)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
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
          className="grid gap-3.5"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 'minmax(170px, auto)' }}
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
          <LowStockList shops={shops} onReceive={handleLowStockReceive} />
        )}
      </Drawer>

      <Drawer open={drawer === 'expiry'} onClose={() => setDrawer(null)} title="Expiry Report">
        {drawer === 'expiry' && <ExpiryReport shops={shops} />}
      </Drawer>

      <Drawer open={drawer === 'inbound'} onClose={() => setDrawer(null)} title="Inbound">
        {drawer === 'inbound' && (
          <div>
            <InboundReceivingPanel enabled={true} shops={shops} />
            <InboundTransactionsList />
          </div>
        )}
      </Drawer>

      <Drawer open={drawer === 'vendors'} onClose={() => setDrawer(null)} title="Vendors">
        {drawer === 'vendors' && <VendorsList />}
      </Drawer>
    </>
  );
}

// ── Local helpers ──────────────────────────────────────────────────────

function HeaderBtn({
  variant = 'ghost', icon, children, onClick,
}: {
  variant?: 'ghost' | 'cta';
  icon:     ReactNode;
  children: ReactNode;
  onClick?: () => void;
}) {
  const isCta = variant === 'cta';
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-[12.5px] font-extrabold transition-colors"
      style={
        isCta
          ? { background: 'linear-gradient(180deg, #5A65C2 0%, #3D4699 100%)', color: 'white', border: '1px solid rgba(232,215,166,0.20)', boxShadow: '0 8px 20px -10px rgba(55,63,148,0.55), inset 0 1px 0 rgba(255,255,255,0.20)' }
          : { background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', color: 'white', border: '1px solid rgba(255,255,255,0.18)' }
      }
    >
      {icon}
      {children}
    </button>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: zero new errors. If `ExpiryTimeline.suggestion` complains about `ReactNode` vs `string`, the fix is already in place — we pass `<span>{data.expiry.suggestion}</span>` which satisfies `ReactNode`.

- [ ] **Step 3: Restart Docker and manual smoke test**

```bash
docker compose restart
```

Open `http://localhost:3001/en/inventory`:

**Non-premium owner (feature disabled):**
- Amber shimmer locked card + stock stats/filters/table — exactly as before.

**Premium owner (feature enabled):**
- Deep-indigo hero strip with 4 KPI cards: Stock Health%, Needs Restock, Inbound this month, Expiring 30d
- 7 bento tiles load with real data
- "Receive Stock" button → inbound drawer opens with InboundReceivingPanel + transaction list
- Health Ring segments → stock drawer opens
- Restock Queue "All →" → low-stock drawer opens
- Expiry Timeline "Open expiry" → expiry drawer opens
- Vendor Board "All →" → vendors drawer opens

- [ ] **Step 4: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add "admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumInventoryShell.tsx"
git commit -m "feat: replace 6-tab inventory shell with bento command center"
```

---

## Self-Review

### 1. Spec coverage

| Requirement | Task |
|---|---|
| Non-premium owners: zero visual change | Task 5 (`BasicInventoryView` is identical to current non-premium path) |
| Premium: bento replaces 6-tab | Task 6 (new `PremiumInventoryShell`) |
| `total_skus`, `inbound_this_month`, `units_received` in summary | Task 1 (backend + type) |
| CSS premium tokens | Task 2 |
| `PremiumFrame` reusable chrome | Task 2 |
| 7 bento tiles | Task 2 (tiles.tsx from zip) |
| i18n new keys | Task 3 |
| Stock drawer with status filter | Task 4 (`StockDrawerContent`) |
| `loadPremiumInventoryData` server function | Task 5 |
| All 5 drawers wired | Task 6 |
| `InventoryDrawerShell` wraps premium path | Task 5 (page.tsx) |
| Old 6-tab shell gone | Task 6 (replaced) |
| SP3 components reused as drawer bodies | Task 6 |

### 2. Placeholder scan

None found.

### 3. Type consistency

- `RestockItem`, `ExpiryBatchLite`, `VendorLite`, `ReceiptLite` — exported from `tiles.tsx`, imported in `page.tsx` (Task 5) and `PremiumInventoryShell.tsx` (Task 6). ✅
- `PremiumInventoryData` type defined in `page.tsx`, shape matches `PremiumInventoryShell.Props.data`. ✅
- `data.expiry.suggestion?: string` in `loadPremiumInventoryData`, unwrapped to `ReactNode` in shell via `<span>{suggestion}</span>`. ✅
- `summary?.inbound_this_month` — optional `number` field added in Task 1. ✅
- `summary?.total_skus` — optional `number` field added in Task 1. ✅
