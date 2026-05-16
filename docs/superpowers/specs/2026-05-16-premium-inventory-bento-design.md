# Premium Inventory Command Center — Bento Redesign

**Date:** 2026-05-16  
**Status:** Approved  
**Scope:** Replace the 6-tab premium inventory shell with the bento command center from the provided zip. Non-premium owners are completely unaffected.  
**Depends on:** SP1, SP2, SP3 (all existing inventory components reused as drawer bodies)

---

## The Problem

The current `inventory/page.tsx` renders two experiences grafted together:
- Classic stock table on top  
- 6-tab premium strip below (Stock / Inbound / Vendors / Low Stock / Expiry / Reports)

This looks like two pages stitched together with no premium signal. The new design replaces this with one of two clean experiences, chosen by feature flag at the server component level.

---

## Two Experiences

**Feature disabled (`inventory_inbound_receiving = false`):**  
Non-premium owners see the exact same inventory page as before — stock table, search/filter, adjust stock. **Zero visual change. This branch is untouched.**

**Feature enabled (`inventory_inbound_receiving = true`):**  
The entire `/inventory` route becomes the "Inventory Control Center" — a bento dashboard with a premium hero + 7 data tiles. No stock table alongside it. The classic table is reachable via the Health Ring tile (drawer). All SP3 components (LowStockList, ExpiryReport, etc.) become drawer bodies.

---

## File Map

### New files
| Source (zip) | Destination |
|---|---|
| `PremiumFrame.tsx` | `admin/src/components/premium/PremiumFrame.tsx` |
| `tiles.tsx` | `admin/src/app/[locale]/(dashboard)/inventory/_components/tiles.tsx` |

### Modified files
| File | Change |
|---|---|
| `admin/src/styles/globals.css` | Append `premium.css` content |
| `admin/src/app/[locale]/(dashboard)/inventory/_components/PremiumInventoryShell.tsx` | Replaced with zip version + drawer wiring + type fixes |
| `admin/src/app/[locale]/(dashboard)/inventory/page.tsx` | Feature flag branch + `loadPremiumInventoryData` + `BasicInventoryView` helper |
| `admin/src/types/api.ts` | Add 3 new fields to `PremiumInventorySummary` |
| `admin/src/messages/en.json` | Merge i18n-keys.json content |
| `admin/src/messages/ar.json` | Arabic translations for new keys |
| `backend/apps/inventory/views.py` | Add 3 alias fields to `PremiumSummaryView` response |

### Unchanged (reused as drawer bodies)
`LowStockList.tsx`, `ExpiryReport.tsx`, `VendorReport.tsx`, `VendorsList.tsx`, `InboundReceivingPanel.tsx`, `InboundTransactionsList.tsx` — no modifications.

---

## Backend Changes

`PremiumSummaryView` adds 3 new fields alongside existing ones (backward compatible):

```python
return Response({
    "success": True,
    "data": {
        # existing fields unchanged
        "stock_items_count":            stock_items_count,
        "low_stock_count":              low_stock_count,
        "out_of_stock_count":           out_of_stock_count,
        "expiring_soon_count":          expiring_soon_count,
        "expired_count":                expired_count,
        "active_vendors_count":         active_vendors_count,
        "inbound_this_month_count":     inbound_this_month_count,
        "received_quantity_this_month": str(received_qty),
        # new alias fields for the bento shell
        "total_skus":         stock_items_count,
        "inbound_this_month": inbound_this_month_count,
        "units_received":     str(received_qty),
    },
})
```

---

## Type Changes (`PremiumInventorySummary`)

```typescript
export interface PremiumInventorySummary {
  // existing fields — unchanged, still used by PremiumKPIRow
  stock_items_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
  active_vendors_count: number;
  inbound_this_month_count: number;
  received_quantity_this_month: string;
  // new alias fields — used by the bento shell
  total_skus?: number;
  inbound_this_month?: number;
  units_received?: string;
}
```

---

## `loadPremiumInventoryData`

Server-side async function in `page.tsx`. All calls run in parallel after `fetchPremiumSummaryAction()`.

```typescript
type PremiumInventoryData = {
  health:   { pct: number; inStock: number; low: number; out: number };
  velocity: { series: number[]; labels: string[]; avgPerDay: number; peak: { value: number; label: string }; spend: string; deltaPct: number };
  restock:  RestockItem[];
  expiry:   { batches: ExpiryBatchLite[]; nearestDangerCount: number; suggestion?: ReactNode };
  vendors:  VendorLite[];
  receipts: ReceiptLite[];
};
```

**Data sources per tile:**

| Tile prop | Source | Notes |
|---|---|---|
| `health` | `fetchPremiumSummaryAction()` result | `pct = inStock / total * 100` |
| `velocity.series` | `fetchInboundListAction({ page: 1 })` | Group transactions by day, last 14 days |
| `velocity.spend` | Summed `total_quantity` from inbound list | No unit cost available at list level → use quantity string |
| `restock` | `fetchStockLevelsAction({ status: 'low_stock', limit: 10 })` | `vendor = '—'` (not in stock level model) |
| `expiry.batches` | `fetchExpiryReportAction({ status: 'expiring_soon', page: 1 })` | First 8 results |
| `expiry.nearestDangerCount` | Same result | Count where `days_remaining ≤ 7` |
| `vendors` | `fetchVendorSummaryAction()` | Top 5; `onTime = 100` (placeholder) |
| `receipts` | `fetchInboundListAction({ page: 1 })` | First 5 transactions |

---

## Drawer Wiring

5 drawers wired in `PremiumInventoryShell` using the existing `Drawer` component:

| Drawer key | Body | Trigger |
|---|---|---|
| `stock` | `InventoryTable` + `InventoryFilters` | Health Ring segments, Quick Actions "Adjust" |
| `lowstock` | `LowStockList` | Restock Queue "All →" |
| `expiry` | `ExpiryReport` | Expiry Timeline "Open expiry" |
| `inbound` | `InboundReceivingPanel` + `InboundTransactionsList` | Velocity "Open inbound", Receipts "Open inbound", "Receive Stock" header btn, Quick Actions "Receive" |
| `vendors` | `VendorsList` | Vendor Board "All →", Quick Actions "Add vendor" |

**Pre-fill on Receive:** When `RestockQueue.onReceive(item)` fires, the `inbound` drawer opens. Product pre-fill into the form is deferred (same approach as SP3's Low Stock tab — just opens the drawer).

---

## Shell Drawer Context

The premium shell needs `InventoryDrawerShell` wrapping it so the `stock` drawer can use `StockAdjustDrawer` / `StockHistoryDrawer` via `InventoryDrawerContext`. The page renders:

```tsx
// Premium path
return (
  <InventoryDrawerShell>
    <PremiumInventoryShell shops={shops} summary={summary} data={data} />
  </InventoryDrawerShell>
);
```

The `stock` drawer body is `InventoryTable` + `InventoryFilters` (passed as children to `Drawer`). The `InventoryDrawerShell` context lets rows inside the stock drawer trigger the existing adjust/history drawers.

---

## `page.tsx` Structure

```tsx
export default async function InventoryPage({ searchParams }) {
  const [bizRes, profileRes] = await Promise.all([fetchBusiness(), fetchUserProfile()]);
  if (bizRes?.data?.[0]?.business_type !== 'shop') notFound();

  const shops = bizRes?.data?.[0]?.shops ?? [];
  const isPremium = Boolean(profileRes?.data?.enabled_features?.inventory_inbound_receiving);

  if (!isPremium) {
    return <BasicInventoryView shops={shops} searchParams={searchParams} />;
  }

  const [summaryRes, data] = await Promise.all([
    fetchPremiumSummaryAction(),
    loadPremiumInventoryData(shops),
  ]);
  const summary = summaryRes?.ok ? summaryRes.data : null;

  return <PremiumInventoryShell shops={shops} summary={summary} data={data} />;
}
```

`BasicInventoryView` is extracted from the current page — wraps `InventoryDrawerShell` + `InventoryPageHeader` + `InboundReceivingPanel` (locked) + `InventoryStats` + `InventoryFilters` + `InventoryTable`. **Identical to the current page behavior.**

---

## i18n

New keys to add under `inventory.premium` in both `en.json` and `ar.json`:

```json
"featureName": "Inventory Control Center",
"planName": "Pro Inventory",
"receiveStock": "Receive Stock",
"kpiHealth": "Stock Health",
"kpiRestock": "Needs restock",
"kpiInboundMonth": "Inbound (mo.)",
"kpiExpiring30": "Expiring 30d",
"quickReceive": "Receive stock",
"quickReceiveHint": "New inbound transaction",
"quickAdjust": "Adjust stock",
"quickAdjustHint": "Damage · loss · count",
"quickVendor": "Add vendor",
"quickVendorHint": "New supplier",
"quickReport": "Generate report",
"quickReportHint": "Vendor / category",
"expirySuggestion": "{count, plural, one {# batch} other {# batches}} expire within 5 days. Suggested: run a markdown."
```

The existing `tabStock`, `tabInbound`, `tabVendors`, `tabLowStock`, `tabExpiry`, `tabReports` keys are no longer used by the shell (tabs are gone) but remain in the JSON — no i18n regression.

---

## CSS Tokens (premium.css → globals.css)

Appended to `globals.css`:
- CSS custom properties: `--premium-50…900`, `--premium-ink`, `--gold-soft/deep`
- Utility classes: `.bg-premium-grad`, `.bg-premium-cta`, `.bg-premium-hero`, `.premium-hero-sheen`, `.premium-live-dot`

These classes are scoped to premium chrome and tiles only. No bleeding into other pages.

---

## Acceptance Criteria

1. Owner with `inventory_inbound_receiving=false` sees the EXACT same `/inventory` page — no visual change
2. Owner with `inventory_inbound_receiving=true` sees the Inventory Control Center bento grid
3. All 7 tiles render with real data
4. Health Ring segments, Restock Queue "All →", Expiry Timeline CTA, Velocity CTA, Vendor Board CTA, Recent Receipts CTA — each opens the correct drawer
5. "Receive Stock" header button opens the inbound drawer
6. `npx tsc --noEmit` passes (no new errors)
7. Basic stock table is no longer rendered alongside the premium frame
8. English and Arabic render cleanly
