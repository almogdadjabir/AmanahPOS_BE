# Premium Inventory — Sub-project 3 Design

**Date:** 2026-05-16  
**Status:** Approved  
**Scope:** Low Stock tab, Expiry tab, Reports tab — completing the 6-tab premium inventory shell  
**Depends on:** SP1 (backend endpoints), SP2 (tab shell + components already built)  

---

## Summary of Decisions

| Decision | Choice |
|---|---|
| Reports tab format | Vendor delivery summary table (no charts) |
| Low Stock CTA | Switch to Inbound tab + show restocking hint banner |
| Reports tab data source | `GET /api/v1/inventory/inbound/vendor-summary/` |
| Expiry tab vendor filter | Deferred (backend supports it, UI defer to SP4) |

---

## Shell Changes

`PremiumInventoryShell` gains 3 new tabs and a `lowStockHint` state:

**New tabs (appended after Vendors):**
- Low Stock (`tabLowStock`)
- Expiry (`tabExpiry`)
- Reports (`tabReports`)

**Tab bar update:** Add `overflow-x-auto` to the tab bar container and `shrink-0` to each button so the 6-tab bar scrolls horizontally on narrow screens rather than wrapping.

**New state: `lowStockHint`**
```typescript
const [lowStockHint, setLowStockHint] = useState<{ productName: string; quantity: string } | null>(null);
```

When a user clicks "Receive" on a low-stock row:
1. `setLowStockHint({ productName, quantity })` is called
2. `switchTab('inbound')` is called
3. The Inbound tab renders a dismissible amber banner: "Restocking reminder: [Product Name] is at [qty] units"
4. Banner is dismissed by the user clicking ✕, which calls `setLowStockHint(null)`

**New i18n keys** (`inventory.premium`):
```json
"tabLowStock": "Low Stock",
"tabExpiry": "Expiry",
"tabReports": "Reports",
"lowStockHint": "Restocking reminder: {productName} is at {quantity} units.",
"lowStockHintDismiss": "Dismiss"
```

---

## New Files

| File | Purpose |
|---|---|
| `_components/LowStockList.tsx` | Client Component — paginated low-stock table with Receive CTA |
| `_components/ExpiryReport.tsx` | Client Component — expiry batch table with status filter tabs |
| `_components/VendorReport.tsx` | Client Component — vendor delivery summary with date/shop filters |

**Modified files:**
| File | Change |
|---|---|
| `_components/PremiumInventoryShell.tsx` | Add 3 tabs, `lowStockHint` state, tab bar overflow scroll |
| `actions/inventory.ts` | Add `fetchVendorSummaryAction` |
| `messages/en.json` | Add 5 new `inventory.premium` keys + `lowStock.*`, `expiry.*`, `reports.*` sections |
| `messages/ar.json` | Same keys in Arabic |
| `types/api.ts` | Add `VendorSummaryData` and `VendorSummaryItem` interfaces |

---

## Low Stock Tab

### `LowStockList`

**Data:** `fetchStockLevelsAction({ status: 'low_stock', limit: 50, shop?: shopId, search?: search })`  
The existing `fetchStockLevelsAction` supports `status: 'low_stock'` — no new action needed.

**Props:** `onReceive(productName: string, quantity: string): void`  
Called when user clicks the per-row "Receive" button.

**Columns:** Product · SKU · Shop · Qty · Min Level · Status · Receive  
**Qty color coding:**
- `quantity === '0'` → red text
- `quantity > 0` → amber text

**Controls:**
- Search input (debounced 300ms) — filters by product name via `search` param
- Shop dropdown (shown only when business has multiple shops) — filters via `shop` param
- Load more button when `count > results.length`

**Empty state:** "All products are well-stocked — nothing needs restocking right now."

**Note:** `StockLevel` type already has `product_name`, `product_sku`, `shop_name`, `quantity`, `is_low_stock`, `is_out_of_stock`. The `min_stock_level` is NOT in the serializer response — omit the "Min Level" column from the table spec. Use `is_out_of_stock` for red, `is_low_stock` for amber.

---

## Expiry Tab

### `ExpiryReport`

**Data:** `fetchExpiryReportAction(params)` from SP1 actions.

**Status filter tabs** (pill style, inline above table):
- All (default)
- Expiring Soon (`status: 'expiring_soon'` — ≤30 days)
- Expired (`status: 'expired'`)

Switching tab re-fetches with the new `status` param.

**Columns:** Product · SKU · Shop · Batch # · Qty · Expiry Date · Days

**Days Remaining color coding:**
- `days_remaining < 0` → red (expired)
- `0 ≤ days_remaining ≤ 30` → amber (expiring soon)
- `days_remaining > 30` → green

**Controls:**
- Shop dropdown (if multiple shops) — passes `shop_id` param
- Load more button

**Empty states per filter:**
- All: "No batches on record."
- Expiring Soon: "No batches expiring in the next 30 days."
- Expired: "No expired batches."

---

## Reports Tab

### `VendorReport`

**New action:** `fetchVendorSummaryAction(params?)` — wraps `GET /api/v1/inventory/inbound/vendor-summary/`.

**New types** (`types/api.ts`):
```typescript
export interface VendorSummaryItem {
  vendor_id: string;
  vendor_name: string;
  transactions_count: number;
  total_quantity: string;
}

export interface VendorSummaryData {
  total_transactions: number;
  total_quantity: string;
  vendors: VendorSummaryItem[];
}
```

**Action signature:**
```typescript
export interface VendorSummaryParams {
  shop_id?:   string;
  date_from?: string;
  date_to?:   string;
}

export type VendorSummaryResult =
  | { ok: true; data: VendorSummaryData }
  | { ok: false; error: string };

export async function fetchVendorSummaryAction(params?: VendorSummaryParams): Promise<VendorSummaryResult>
// GET /api/v1/inventory/inbound/vendor-summary/
// Query params: shop_id, date_from, date_to
```

**Top KPI row** — 2 mini stat items (not full `StatCard`, just inline text):
- Total Transactions: `data.total_transactions`
- Total Units Received: `data.total_quantity`

**Table** — sorted by `transactions_count` descending:
| Vendor | Transactions | Total Qty |
|---|---|---|

**Filters (above the table):**
- Shop dropdown (if multiple shops)
- Date From / Date To (date inputs)
- "Apply" button triggers re-fetch

**Empty state:** "No inbound transactions found for the selected period."

---

## i18n Keys

New keys under `inventory` in both `en.json` and `ar.json`:

```json
"premium": {
  // existing keys...
  "tabLowStock": "Low Stock",
  "tabExpiry": "Expiry",
  "tabReports": "Reports",
  "lowStockHint": "Restocking reminder: {productName} is at {quantity} units.",
  "lowStockHintDismiss": "Dismiss"
},
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
  "colExpiry": "Expiry Date",
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

---

## Acceptance Criteria

1. Tab bar shows 6 tabs: Stock · Inbound · Vendors · Low Stock · Expiry · Reports
2. Tab bar scrolls horizontally on narrow screens without wrapping
3. Clicking "Receive" on a Low Stock row switches to Inbound tab and shows hint banner
4. Hint banner shows product name + quantity, dismissable with ✕
5. Low Stock table shows products with `is_low_stock=true`, color-coded qty
6. Low Stock search and shop filter work correctly
7. Expiry tab renders All/Expiring Soon/Expired filter tabs; switching re-fetches
8. Expiry table shows days remaining with color coding (red/amber/green)
9. Reports tab shows total transactions + total units KPIs
10. Reports vendor table lists vendors sorted by transaction count
11. Reports date range + shop filter re-fetch data on "Apply"
12. All new text is i18n-keyed (en + ar)
13. TypeScript compiles clean
14. All 3 new tabs are lazy-mounted (only mount on first visit)
15. No existing tabs (Stock, Inbound, Vendors) are broken
