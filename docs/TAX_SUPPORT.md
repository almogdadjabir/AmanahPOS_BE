# Tax Support — Mobile Implementation Guide

This document describes the tax system added to the AmanaPOS backend and admin
dashboard, so the mobile POS app can support it.

**Golden rule: tax is always calculated server-side.** The mobile app never
sends tax amounts — it only reads the business's tax configuration to display
prices correctly, and reads the computed tax fields back from the sale
response/receipt.

---

## 1. Business Tax Configuration

Each `Business` (tenant) has its own tax configuration. Owners configure this
once from the admin dashboard (Settings → Tax Settings).

**Endpoint:** `GET /api/v1/tenants/businesses/<id>/`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Main Shop",
    "tax_enabled": true,
    "tax_name": "VAT",
    "tax_rate": "15.00",
    "tax_inclusive": false,
    "...": "...other business fields"
  }
}
```

| Field           | Type              | Default | Meaning                                                                 |
| --------------- | ----------------- | ------- | ------------------------------------------------------------------------ |
| `tax_enabled`   | boolean           | `false` | Master switch. If `false`, no tax is applied to sales at all.            |
| `tax_name`      | string            | `"VAT"` | Display label for the tax (e.g. "VAT", "GST", "Sales Tax").              |
| `tax_rate`      | string (decimal)  | `"0.00"` | Percentage, `0`–`100`, e.g. `"15.00"` = 15%.                             |
| `tax_inclusive` | boolean           | `false` | `true` = product prices already include tax. `false` = tax is added on top of the price. |

**Mobile guidance:**

- Fetch (and cache) this on app start / login, and whenever the business
  profile is refreshed.
- One configuration applies to **all products and all shops** under the
  business — there are no per-product tax rates.
- If `tax_enabled` is `false`, hide all tax UI (no "Tax" line on the cart or
  receipt).

---

## 2. How Tax Is Calculated (Server-Side)

This logic runs in `create_sale()` on the backend — it's documented here so
the mobile app can **preview** the same numbers before submitting, but the
final, authoritative numbers always come back in the sale response.

```
taxable_amount = total_amount - discount_amount   # after item + sale discounts

if tax_enabled:
    rate = tax_rate / 100

    if tax_inclusive:
        # Prices already include tax → extract it
        tax_amount = taxable_amount - (taxable_amount / (1 + rate))
        net_amount = taxable_amount
    else:
        # Tax added on top
        tax_amount = taxable_amount * rate
        net_amount = taxable_amount + tax_amount

    # both rounded to 2 decimals, ROUND_HALF_UP
else:
    tax_amount = 0
    net_amount = taxable_amount
```

**Examples (rate = 15%):**

| Mode      | `total_amount` | `discount_amount` | `taxable_amount` | `tax_amount` | `net_amount` |
| --------- | --------------- | ------------------- | ----------------- | -------------- | -------------- |
| Exclusive | 100.00          | 10.00                | 90.00              | 13.50           | 103.50          |
| Inclusive | 100.00          | 10.00                | 90.00              | 11.74           | 90.00           |

**Receipt display:**

- **Exclusive:** `Subtotal: 90.00` → `Tax (VAT 15%): 13.50` → `Total: 103.50`
- **Inclusive:** `Total (incl. VAT 15%): 90.00` → optionally show `Tax included: 11.74`

There is **no per-line-item tax breakdown** — tax is calculated once on the
sale's taxable amount.

---

## 3. Creating a Sale

**Endpoint:** `POST /api/v1/sales/`

The request shape is **unchanged** by tax support — do **not** send `tax_amount`,
`tax_rate`, or `tax_inclusive`. The server reads the business's current tax
settings and computes everything.

```json
{
  "shop": "shop-uuid",
  "items": [
    { "product_id": "product-uuid-1", "quantity": "1.000", "unit_price": "50.00", "discount": "5.00" },
    { "product_id": "product-uuid-2", "quantity": "1.000", "unit_price": "55.00", "discount": "5.00" }
  ],
  "payment_method": "cash",
  "customer": null,
  "discount_amount": "10.00",
  "notes": ""
}
```

**Response** (`SaleSerializer`):

```json
{
  "success": true,
  "message": "Sale created successfully.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "receipt_number": "REC00000001",
    "total_amount": "100.00",
    "discount_amount": "10.00",
    "tax_amount": "13.50",
    "tax_rate": "15.00",
    "tax_inclusive": false,
    "net_amount": "103.50",
    "payment_method": "cash",
    "status": "completed",
    "items": [
      { "id": "...", "product_name": "Item A", "quantity": "1.000", "unit_price": "50.00", "discount": "5.00", "subtotal": "45.00" },
      { "id": "...", "product_name": "Item B", "quantity": "1.000", "unit_price": "55.00", "discount": "5.00", "subtotal": "55.00" }
    ],
    "created_at": "2026-06-11T19:00:00Z",
    "updated_at": "2026-06-11T19:00:00Z"
  }
}
```

| New/relevant field | Type             | Writable?       | Notes                                                              |
| -------------------- | ----------------- | ----------------- | --------------------------------------------------------------------- |
| `tax_amount`        | string (decimal) | read-only        | Computed tax for this sale.                                            |
| `tax_rate`          | string (decimal) | read-only        | **Snapshot** of `Business.tax_rate` at the time of sale.               |
| `tax_inclusive`     | boolean          | read-only        | **Snapshot** of `Business.tax_inclusive` at the time of sale.          |
| `net_amount`        | string (decimal) | read-only        | Final payable total (was previously what "total" meant on the receipt). |
| `total_amount`      | string (decimal) | read-only        | Gross sum of item subtotals before tax/discount.                       |
| `discount_amount`   | string (decimal) | input (optional) | Sale-level discount, unchanged.                                        |

> `tax_rate` / `tax_inclusive` are **historical snapshots** — even if the
> owner changes the tax rate later, old receipts keep the rate that was
> active when the sale was made.

---

## 4. Offline Sync

**Endpoint:** `POST /api/v1/sales/offline-sync/`

Same rule applies: the mobile app submits sales using the same `items` /
`discount_amount` payload as `POST /api/v1/sales/` (plus its existing offline
fields like `client_sale_id`, `synced_at`). **Do not compute or send tax
fields** — the server recomputes `tax_amount`, `tax_rate`, `tax_inclusive`,
and `net_amount` based on the business's tax settings **at sync time**.

> If the device was offline while the owner changed tax settings, the synced
> sale's tax will reflect the settings active at sync time, not at the
> original time of sale. This matches current backend behavior — flag to the
> team if stricter point-in-time accuracy is needed later.

---

## 5. Sale Detail / Receipt

**Endpoint:** `GET /api/v1/sales/<id>/`

Returns the same `tax_amount`, `tax_rate`, `tax_inclusive`, `net_amount`
fields shown above, plus per-item `subtotal` (no per-item tax). Use this to
render/reprint receipts.

---

## 6. Sales Reports / Analytics

**Endpoint:** `GET /api/v1/sales/reports/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD[&shop_id=...]`

```json
{
  "success": true,
  "data": {
    "range": { "from": "2026-06-11", "to": "2026-06-11" },
    "currency": "SDG",
    "summary": {
      "gross_sales_amount": 5000.00,
      "net_sales_amount": 4500.00,
      "total_tax_collected": 750.00,
      "sales_count": 15,
      "average_sale_amount": 300.00,
      "refund_amount": 200.00,
      "refund_count": 1
    },
    "trend": { "...": "..." },
    "payment_methods": [ "..." ],
    "top_products": [ "..." ],
    "top_categories": [ "..." ],
    "peak_hours": [ "..." ],
    "day_of_week": [ "..." ]
  }
}
```

The key tax metric is **`summary.total_tax_collected`** — sum of `tax_amount`
across completed sales in the date range. Useful for a "Tax Collected" KPI on
a mobile dashboard, mirroring the admin sales page.

---

## 7. Checklist for Mobile

- [ ] Fetch `Business` tax fields (`tax_enabled`, `tax_name`, `tax_rate`, `tax_inclusive`) on login / business switch and cache them.
- [ ] Cart/checkout screen: if `tax_enabled`, show a "Tax (`tax_name` `tax_rate`%)" line using the formulas in §2; hide it entirely if `tax_enabled` is `false`.
- [ ] Do **not** send any tax fields when creating sales (online or offline sync) — server computes them.
- [ ] Receipt screen: read `tax_amount`, `tax_rate`, `tax_inclusive`, `net_amount`, `total_amount`, `discount_amount` from the sale response and render accordingly (exclusive vs. inclusive layouts differ — see §2).
- [ ] Reports/dashboard: optionally surface `summary.total_tax_collected` from `/api/v1/sales/reports/`.
