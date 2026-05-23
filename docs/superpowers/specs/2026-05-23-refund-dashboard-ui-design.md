# Refund / Return — Admin Dashboard UI Design

**Date:** 2026-05-23
**Status:** Approved

---

## Goal

Allow `owner` and `is_staff` users on the admin dashboard to initiate partial or full refunds for completed sales, view a refund stats KPI card showing today's refund activity, and see refund status on each sale row — without leaving the sales page.

---

## Background

The backend already implements `POST /api/v1/sales/{id}/refund/` (supports partial refunds via an `items` array). The mobile app already uses this endpoint. This spec covers the admin dashboard (Next.js) UI only, plus a minor backend extension to expose refund aggregates in the existing summary endpoint.

---

## Architecture

```
sales/page.tsx (server component)
  │  fetches: _recentSales, _todaySummary, fetchUserProfile
  │  derives: canRefund = profile.role === 'owner' || profile.is_staff
  │
  └─→ SalesTableClient (client component)
        props: sales: Sale[], canRefund: boolean
        state: selectedSale: Sale | null
        renders:
          - table rows (row click → setSelectedSale)
          - SaleDrawer (open when selectedSale is set)
```

### Drawer states

| State | What the user sees |
|---|---|
| `view` | Sale detail: receipt#, date, cashier, payment method, status badge, item list. "Refund Items" button visible if `canRefund && status ∈ {completed, partial_refund}`. |
| `refund` | Same item list with per-item quantity inputs (min=0, max=original qty, default=original qty). Running refund total displayed. "Confirm Refund" + "Cancel" buttons. |
| `pending` | Spinner overlay, inputs disabled. |
| `error` | Inline red banner with the error message. User stays in `refund` state and can adjust and retry. |

On success: drawer closes, `revalidateTag('sales')` + `revalidateTag('sales-summary')` refresh the table and stats card.

---

## Files Changed

### Backend

**`backend/apps/sales/views.py` — `SalesSummaryView`**

Add a second aggregate query for refunded/partial_refund sales within the requested date range and shop filter. Append to response:
```python
"refund_count": refund_summary["refund_count"] or 0,
"total_refunds": str(refund_summary["total_refunds"] or 0),
```

### Frontend — new files

| File | Responsibility |
|---|---|
| `admin/src/actions/sales.ts` | `refundSaleAction(saleId, items)` — POST to backend, revalidate cache, return typed result |
| `admin/src/app/[locale]/(dashboard)/sales/_components/SaleDrawer.tsx` | Client component: detail view + refund mode with qty inputs |
| `admin/src/app/[locale]/(dashboard)/sales/_components/SalesTableClient.tsx` | Client wrapper: renders table, manages `selectedSale` state, mounts drawer |

### Frontend — modified files

| File | Change |
|---|---|
| `admin/src/types/api.ts` | Extend `SalesSummary` with `refund_count: number` and `total_refunds: string`. Add `RefundResult` type. |
| `admin/src/app/[locale]/(dashboard)/sales/page.tsx` | `SalesSummarySection`: add refund stats KPI card reading `todayData.refund_count` + `todayData.total_refunds`. `SalesRecentSection`: fetch user profile, pass `canRefund` and `sales` to `SalesTableClient` instead of inline rendering. |
| `admin/src/messages/en.json` | Add keys under `sales.drawer.*` and `sales.refunds.*` |
| `admin/src/messages/ar.json` | Same keys in Arabic |

---

## Server Action Contract

```typescript
// admin/src/actions/sales.ts
'use server';

export type RefundState =
  | { ok: true; refund_reference: string; refund_total: string }
  | { ok: false; error: string }
  | null;

export async function refundSaleAction(
  saleId: string,
  items: { product: string; quantity: number }[],
): Promise<RefundState>
```

- Reads `auth_token` cookie
- POSTs to `${INTERNAL_API_URL}/api/v1/sales/${saleId}/refund/` with `{ items }`
- On HTTP 200: returns `{ ok: true, refund_reference, refund_total }`
- On HTTP 4xx/5xx: returns `{ ok: false, error: err.error?.message ?? 'Refund failed.' }`
- On network error: returns `{ ok: false, error: 'Network error. Please try again.' }`
- On any success: calls `revalidateTag('sales')` + `revalidateTag('sales-summary')`

---

## SaleDrawer Component Contract

```typescript
interface SaleDrawerProps {
  sale: Sale;
  canRefund: boolean;
  onClose: () => void;
}
```

**Qty input logic:**
- Each item initialises at `qty = parseInt(item.quantity)` (full return by default)
- User can reduce to 0 (exclude item from refund)
- Min=0, max=`parseInt(item.quantity)`
- Running total = `Σ (qty × parseFloat(item.unit_price))` for items where qty > 0
- "Confirm Refund" is disabled when: all qtys are 0 OR state is `pending`
- Items with qty=0 are excluded from the `items` array sent to `refundSaleAction`

**Status display:**
- `completed` → green badge "Completed"
- `partial_refund` → orange badge "Partial Refund" (refund button still shown)
- `refunded` → blue badge "Refunded" (refund button hidden)
- `cancelled` / `pending` → no refund button

---

## Types to Add (`admin/src/types/api.ts`)

```typescript
// Extend existing SalesSummary:
export interface SalesSummary {
  // ... existing fields ...
  refund_count: number;
  total_refunds: string;
}

// New type for refund action response:
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

---

## i18n Keys

### `en.json` additions

```json
{
  "sales": {
    "drawer": {
      "title": "Sale Detail",
      "cashier": "Cashier",
      "method": "Payment Method",
      "status": "Status",
      "items": "Items",
      "unitPrice": "Unit Price",
      "qty": "Qty",
      "subtotal": "Subtotal",
      "refundBtn": "Refund Items",
      "confirmRefund": "Confirm Refund",
      "cancel": "Cancel",
      "qtyLabel": "Return qty",
      "refundTotal": "Refund Total",
      "refundSuccess": "Refund processed successfully.",
      "alreadyRefunded": "Already refunded"
    },
    "refunds": {
      "todayTitle": "Today's Refunds",
      "count": "refund",
      "counts": "refunds",
      "noRefunds": "No refunds today"
    }
  }
}
```

### `ar.json` additions (Arabic)

```json
{
  "sales": {
    "drawer": {
      "title": "تفاصيل البيع",
      "cashier": "الكاشير",
      "method": "طريقة الدفع",
      "status": "الحالة",
      "items": "العناصر",
      "unitPrice": "سعر الوحدة",
      "qty": "الكمية",
      "subtotal": "المجموع الفرعي",
      "refundBtn": "استرداد عناصر",
      "confirmRefund": "تأكيد الاسترداد",
      "cancel": "إلغاء",
      "qtyLabel": "كمية الإرجاع",
      "refundTotal": "إجمالي الاسترداد",
      "refundSuccess": "تمت معالجة الاسترداد بنجاح.",
      "alreadyRefunded": "تم الاسترداد مسبقاً"
    },
    "refunds": {
      "todayTitle": "مردودات اليوم",
      "count": "مرتجع",
      "counts": "مرتجعات",
      "noRefunds": "لا مردودات اليوم"
    }
  }
}
```

---

## Refund Stats KPI Card (sales/page.tsx)

Added as a 4th card in `SalesSummarySection`. The existing grid class `grid-cols-1 sm:grid-cols-3` changes to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` to accommodate 4 cards cleanly on all screen sizes.

Shows:
- Label: `t('refunds.todayTitle')` (Today's Refunds)
- Value: `fmtMoney(parseFloat(todayData?.total_refunds ?? '0'))` SDG
- Sub: `N refunds` using `todayData?.refund_count ?? 0`
- Accent colour: `bg-orange-50 text-orange-600` (distinct from the other 3 cards)
- If `refund_count === 0`: sub reads "No refunds today"

Data source: `_todaySummary` cache (already called in `SalesSummarySection`) — after the backend change adds `refund_count` + `total_refunds`, no additional API call is needed.

---

## Role Gating

`canRefund` is derived in the server component:

```typescript
const profile = await fetchUserProfile();
const canRefund = profile?.data?.role === 'owner' || profile?.data?.is_staff === true;
```

Passed as a prop to `SalesTableClient` → forwarded to `SaleDrawer`. The "Refund Items" button is only rendered when `canRefund === true`. The Django backend independently enforces `IsAuthenticated` and checks that the sale belongs to the user's tenant — the frontend gating is UX only.

---

## RTL Support

- Drawer slides in from the right (standard) — on RTL (`dir="rtl"`) it slides in from the left via Tailwind's `rtl:` variants on `translate-x` classes
- Qty inputs are `dir="ltr"` always (numbers don't flip)
- All text labels use `text-start` / `text-end` (not `left`/`right`) so they auto-flip

---

## Constraints

- **No new routes** — everything is within the existing `/sales` page
- **No new UI library** — use existing Tailwind classes and `components/ui/` primitives
- **No partial refund quantity tracking on the frontend** — the backend validates against already-returned qtys server-side. If the user tries to return more than available, they receive a 422 error displayed in the drawer.
- **Backend qty validation is authoritative** — frontend max is `original_qty` (a best-effort guard), not the true remaining returnable qty
