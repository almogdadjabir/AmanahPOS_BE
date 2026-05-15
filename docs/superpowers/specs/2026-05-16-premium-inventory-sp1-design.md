# Premium Inventory — Sub-project 1 Design

**Date:** 2026-05-16  
**Status:** Approved  
**Scope:** Fix broken inbound form (vendor_id) + backend report foundation  
**Does NOT include:** Premium UI shell, tab navigation, report UI panels (sub-project 2+)

---

## Problem Statement

The backend now requires `vendor_id` on `POST /api/v1/inventory/inbound/` but the frontend `InboundReceivingPanel` form has no vendor selector and does not send `vendor_id`. Every inbound submission currently fails. This is the primary blocker.

Additionally, the backend is missing three endpoints that sub-project 2 (the premium UI shell) will depend on:
- `GET /api/v1/inventory/premium-summary/`
- `GET /api/v1/inventory/inbound/<uuid:pk>/`
- `GET /api/v1/inventory/reports/expiry/`

---

## Architecture

### Approach: Option C (Minimal new surface)

Reuse existing well-tested endpoints wherever possible. Add only what truly does not exist. Gate only new premium endpoints — do not retroactively gate existing basic inventory endpoints.

---

## Backend Changes

### Endpoints that already exist — no changes

| Endpoint | Status |
|---|---|
| `GET /api/v1/inventory/inbound/` | ✅ exists — list with filters |
| `GET /api/v1/inventory/inbound/vendor-summary/` | ✅ exists |
| `GET/POST /api/v1/inventory/vendors/` | ✅ exists |
| `GET/PATCH/DELETE /api/v1/inventory/vendors/<id>/` | ✅ exists |
| `GET /api/v1/inventory/stock/?low_stock=true` | ✅ sufficient for low-stock panel |
| `GET /api/v1/inventory/expiry-alerts/` | ✅ returns expiring + expired batches |
| `POST /api/v1/inventory/inbound/` | ✅ exists — already requires vendor_id |

### New endpoint 1: Premium summary

```
GET /api/v1/inventory/premium-summary/
```

**Permission:** `IsAuthenticated + IsManagerOrAbove`  
**Feature gate:** `inventory_inbound_receiving` (raises `SubscriptionLimitError` if not enabled)  
**Query param:** `shop_id` (optional, filters by shop)  
**Tenant scope:** all queries filtered by `request.user.business`

**Response:**
```json
{
  "success": true,
  "data": {
    "stock_items_count": 120,
    "low_stock_count": 8,
    "out_of_stock_count": 3,
    "expiring_soon_count": 5,
    "expired_count": 2,
    "active_vendors_count": 12,
    "inbound_this_month_count": 18,
    "received_quantity_this_month": "420.000"
  }
}
```

**Implementation:**
- `stock_items_count` — `StockLevel.objects.filter(tenant_shop__business=tenant).count()`
- `low_stock_count` — `StockLevel` where `quantity <= product.min_stock_level` using `F()` expressions
- `out_of_stock_count` — `StockLevel` where `quantity <= 0`
- `expiring_soon_count` — `ProductBatch` where `expiry_date` between today and today+30, not expired
- `expired_count` — `ProductBatch` where `expiry_date < today`
- `active_vendors_count` — `Vendor.objects.filter(tenant=tenant, is_active=True).count()`
- `inbound_this_month_count` — `InboundTransaction` where `created_at__month=current_month`
- `received_quantity_this_month` — `Sum` of `InboundTransactionItem.quantity` for this month's transactions

All counts use DB aggregation (`Count`, `Sum`, `F` expressions). No Python loops over rows.

---

### New endpoint 2: Inbound transaction detail

```
GET /api/v1/inventory/inbound/<uuid:pk>/
```

**Permission:** `IsAuthenticated + IsManagerOrAbove`  
**Feature gate:** `inventory_inbound_receiving`  
**Tenant scope:** `InboundTransaction.objects.get(pk=pk, tenant=tenant)`

**Response:** Full `InboundTransactionSerializer` output — header fields + `items[]` array with product name, quantity, unit cost, expiry, batch number, plus nested `vendor` object (`id`, `name`, `phone`).

**Query:** `select_related('vendor', 'shop', 'created_by')` + `prefetch_related('items__product')`

---

### New endpoint 3: Expiry report

```
GET /api/v1/inventory/reports/expiry/
```

**Permission:** `IsAuthenticated + IsManagerOrAbove`  
**Feature gate:** `inventory_inbound_receiving`  
**Pagination:** `StandardPagination`

**Query params:**

| Param | Type | Description |
|---|---|---|
| `status` | `expiring_soon` \| `expired` \| `all` | Default: `all` |
| `shop_id` | UUID | Filter by shop |
| `vendor_id` | UUID | Filter by vendor (via inbound item join) |
| `date_from` | date | Expiry date ≥ |
| `date_to` | date | Expiry date ≤ |
| `search` | string | Product name or batch number |

**Response per item:**
```json
{
  "id": "uuid",
  "product": "uuid",
  "product_name": "Milk 1L",
  "product_sku": "MLK-001",
  "shop": "uuid",
  "shop_name": "Main Shop",
  "batch_number": "LOT-001",
  "quantity": "50.000",
  "expiry_date": "2026-06-01",
  "days_remaining": 16,
  "is_expired": false
}
```

Note: `vendor_id` filter joins through `InboundTransactionItem → InboundTransaction.vendor`. The `ProductBatch` model does not have a direct vendor FK — the join goes through `InboundTransactionItem` matching on `(product, shop, batch_number)`. If no match, vendor filter returns nothing for that batch; this is acceptable for sub-project 1.

Note: `days_remaining` is computed as `(expiry_date - today).days`. Negative values indicate already-expired batches.

**Query:** `ProductBatch.objects.filter(shop__business=tenant).select_related('product', 'shop')`

---

### Performance indexes — migration `0009`

New indexes to add:

**`ProductBatch`:**
- `(shop, expiry_date)` — expiry report filter
- `(product, expiry_date)` — expiry report + batch lookups

**`StockLevel`:**
- `(shop, quantity)` — low-stock queries using `F()` comparisons

**`InboundTransactionItem`:**
- `(product,)` — report joins by product

Confirm existing indexes from migration `0008`:
- `InboundTransaction (tenant, vendor, created_at)` — already added ✅

---

### Feature gating pattern

All three new views use the same pattern as `InboundReceiveView`:

```python
plan = tenant.subscription_plan
if plan is None or not plan.has_feature("inventory_inbound_receiving"):
    raise SubscriptionLimitError(
        "Your plan does not include Premium Inventory. "
        "Upgrade your subscription to access this feature.",
        code="FEATURE_NOT_INCLUDED",
    )
```

Existing endpoints (`stock/`, `expiry-alerts/`, `vendors/`, `inbound/`) are **not** retroactively gated.

---

## Frontend Changes

### Primary fix: Vendor selector in `InboundReceivingPanel`

**Where:** `DrawerContent` component inside `InboundReceivingPanel.tsx`

**Loading:** Client-side, fetched once when drawer mounts via `fetchVendorsAction()`. Consistent with how products are loaded per-shop. Vendors are tenant-wide so a single fetch on mount is sufficient (no per-shop refetch).

**UI position:** Vendor selector renders above the Reference/Invoice field — first decision the user makes is which vendor delivered.

**Select behavior:**
- Shows `vendor.name` as option label
- If `loadingVendors`: shows "Loading vendors…" placeholder, select disabled
- If `vendors.length === 0`: shows "No active vendors found" message, submit disabled
- Selected vendor_id is included as `<input type="hidden" name="vendor_id" />` updated via `onChange`

**Validation:** `createInboundTransactionAction` already validates `vendor_id` server-side. Frontend adds client-side guard: if `vendor_id` is empty string, return early with inline error before dispatching.

**Error handling additions:**
- `"vendor not found"` → "The selected vendor was not found. Please refresh and try again."
- `"inactive vendor"` → "This vendor is inactive. Please select an active vendor."
- `"already exists"` / duplicate reference → existing handling ✅
- `"feature not enabled"` → existing locked card handles this ✅

---

### New server action: `fetchVendorsAction`

**File:** `admin/src/actions/inventory.ts`

```typescript
export type VendorsResult =
  | { ok: true; data: Vendor[] }
  | { ok: false; error: string };

export async function fetchVendorsAction(): Promise<VendorsResult>
// GET /api/v1/inventory/vendors/?is_active=true&page_size=200
// Uses plain fetch (read-only), no-store cache
```

---

### New server actions for sub-project 2 prep

Added to `actions/inventory.ts` so the backend endpoints are exercised before the UI panels are built:

```typescript
// GET /api/v1/inventory/premium-summary/?shop_id=...
export async function fetchPremiumSummaryAction(shopId?: string): Promise<PremiumSummaryResult>

// GET /api/v1/inventory/inbound/<id>/
export async function fetchInboundTransactionAction(id: string): Promise<InboundDetailResult>

// GET /api/v1/inventory/reports/expiry/?...
export async function fetchExpiryReportAction(params: ExpiryReportParams): Promise<ExpiryReportResult>
```

These actions exist but are not consumed by any UI component yet. Sub-project 2 will wire them up.

---

### Type changes (`admin/src/types/api.ts`)

**Add `Vendor`:**
```typescript
export interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Add `PremiumInventorySummary`:**
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
}
```

**Update `InboundTransaction`:**
```typescript
export interface InboundTransaction {
  id: string;
  reference: string;
  notes: string;
  shop: string;
  shop_name: string;
  vendor: Vendor | null;           // added
  total_quantity: string;          // added
  item_count: number;
  items: InboundTransactionItem[];
  created_at: string;
  created_by_name: string | null;  // added
}
```

---

### i18n additions (`en.json` + `ar.json`)

Under `inventory.inbound`:
```json
"vendor": "Vendor",
"vendorPlaceholder": "Select vendor…",
"vendorLoading": "Loading vendors…",
"noVendors": "No active vendors. Add a vendor first.",
"vendorInactive": "This vendor is inactive. Please select an active vendor.",
"vendorNotFound": "Vendor not found. Please refresh and try again."
```

---

## What Does NOT Change

- `InventoryTable`, `InventoryStats`, `InventoryFilters` — unchanged
- `InboundReceivingPanel` locked card — unchanged  
- No new sidebar navigation
- No tab shell
- No report UI panels
- No vendor management UI
- Existing `expiry-alerts/` endpoint — unchanged, not gated

---

## Acceptance Criteria

1. Owner can submit an inbound transaction with a vendor selected — no 400/404 errors.
2. Vendor selector shows active vendors, disables submit if none.
3. `vendor_id` is sent in the POST body.
4. Backend errors (inactive vendor, not found, duplicate ref, feature disabled) are surfaced as inline form errors.
5. `GET /api/v1/inventory/premium-summary/` returns correct aggregated data gated by feature.
6. `GET /api/v1/inventory/inbound/<id>/` returns full transaction with items and vendor.
7. `GET /api/v1/inventory/reports/expiry/` returns paginated, filterable batch data gated by feature.
8. Migration `0009` applies cleanly with no data loss.
9. All new backend endpoints return 400/422 when feature is disabled.
10. TypeScript compiles with zero new errors.
11. Existing inbound, stock, and adjustment functionality is unaffected.

---

## Files Changed

**Backend (new/modified):**
- `apps/inventory/views.py` — add `PremiumSummaryView`, `InboundDetailView`, `ExpiryReportView`
- `apps/inventory/serializers.py` — add `ExpiryBatchSerializer`; update `InboundTransactionSerializer` to expose `created_by_name`
- `apps/inventory/urls.py` — register 3 new paths
- `apps/inventory/migrations/0009_inventory_performance_indexes.py` — new indexes
- `apps/inventory/tests/test_premium_summary.py` — new test file

**Frontend (modified):**
- `admin/src/types/api.ts` — `Vendor`, `PremiumInventorySummary`, updated `InboundTransaction`
- `admin/src/actions/inventory.ts` — `fetchVendorsAction`, `fetchPremiumSummaryAction`, `fetchInboundTransactionAction`, `fetchExpiryReportAction`
- `admin/src/app/[locale]/(dashboard)/inventory/_components/InboundReceivingPanel.tsx` — vendor selector + vendor_id in POST
- `admin/src/messages/en.json` — vendor i18n keys
- `admin/src/messages/ar.json` — Arabic vendor i18n keys
