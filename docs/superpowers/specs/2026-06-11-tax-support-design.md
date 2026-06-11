# Tax Support (Backend) — Design Spec

**Goal:** Add a configurable, per-business sales tax system to AmanaPOS — enable/disable, single rate, inclusive/exclusive pricing, and a custom label (e.g. "VAT"). Tax is computed server-side during sale creation and surfaced in sales, reports, dashboard, and the mobile bootstrap payload.

**Architecture:** 4 new fields on `Business` (tax config), 2 new snapshot fields on `Sale` (audit trail of the rate/mode applied at sale time). Tax is calculated entirely in `apps.sales.services.create_sale()` — no new models, no per-product/category tax fields. Server is the single source of truth; client-supplied `tax_amount` is removed from input serializers.

**Tech Stack:** Django 5, DRF, existing `Business` / `Sale` models, `Decimal` with `ROUND_HALF_UP`.

**Context (from research):** Sudan VAT standard rate is 17%; MENA rates vary widely (UAE 5%, Egypt 14%, Saudi 15%, Sudan 17%). Many small Sudanese merchants are not VAT-registered, so "off by default, opt-in" is essential. Established POS systems (Square, Toast) treat inclusive/exclusive as a config toggle that changes how the *existing* product price is interpreted, not something requiring re-entry of prices.

---

## 1. Data Model Changes

### `Business` model (`apps/tenants/models/business.py`) — 4 new fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `tax_enabled` | `BooleanField` | `False` | Master on/off switch. Off = zero behavior change (current state). |
| `tax_name` | `CharField(max_length=50)` | `"VAT"` | Label shown on receipts/reports/UI. Editable (e.g. "GST", "Sales Tax"). |
| `tax_rate` | `DecimalField(max_digits=5, decimal_places=2)`, validators `MinValueValidator(0)` + `MaxValueValidator(100)` | `0` | Percentage, e.g. `17.00`. |
| `tax_inclusive` | `BooleanField` | `False` | `True` = `Product.price` already includes tax (extracted for reporting). `False` = tax added on top of price at sale time. |

Migration: `apps/tenants/migrations/XXXX_business_tax_settings.py`

### `Sale` model (`apps/sales/models/sale.py`) — 2 new snapshot fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `tax_rate` | `DecimalField(max_digits=5, decimal_places=2)` | `0` | Snapshot of `tenant.tax_rate` at sale creation — preserves historical accuracy if the rate changes later. |
| `tax_inclusive` | `BooleanField` | `False` | Snapshot of `tenant.tax_inclusive` at sale creation. |

Existing `Sale.tax_amount` (`DecimalField`, default `0`) is retained — now server-computed instead of client-supplied.

Migration: `apps/sales/migrations/XXXX_sale_tax_snapshot.py`

**No changes to `Product` or `SaleItem`** — single business-wide rate, no per-product tax-exempt flag (explicitly decided against — "all or nothing" per business).

---

## 2. Calculation Logic

All calculation happens in `apps.sales.services.create_sale()`. The `tax_amount: Decimal` parameter is **removed** from the function signature — server computes it from `tenant.tax_*` fields.

```python
from decimal import Decimal, ROUND_HALF_UP

taxable_amount = total_amount - discount_amount

if tenant.tax_enabled:
    rate = tenant.tax_rate / Decimal("100")
    if tenant.tax_inclusive:
        # Product price already includes tax — extract it for reporting.
        # net_amount stays equal to taxable_amount (customer pays the listed price).
        tax_amount = taxable_amount - (taxable_amount / (Decimal("1") + rate))
        net_amount = taxable_amount
    else:
        # Tax added on top of the listed price.
        tax_amount = taxable_amount * rate
        net_amount = taxable_amount + tax_amount

    tax_amount = tax_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    net_amount = net_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
else:
    tax_amount = Decimal("0")
    net_amount = taxable_amount
```

`Sale.tax_rate` and `Sale.tax_inclusive` are set from `tenant.tax_rate` / `tenant.tax_inclusive` at creation time (snapshot), regardless of whether tax is enabled (if disabled, both remain `0`/`False`).

**Rounding:** sale-level rounding (one tax calculation on the post-discount total), not per-line-item — matches existing 2-decimal-place convention and avoids per-line penny drift.

---

## 3. API Contract Changes

### 3.1 Business config (`apps/tenants/serializers.py`)

Add to `BusinessSerializer` (read) and `BusinessUpdateSerializer` (write):

```python
fields = [..., "tax_enabled", "tax_name", "tax_rate", "tax_inclusive"]
```

`BusinessUpdateSerializer` validates `tax_rate` is between 0 and 100 (model validators already enforce this; serializer-level `validate_tax_rate` gives a clean 400 instead of a 500 on `full_clean` bypass).

Updated via existing `PATCH /api/v1/tenants/businesses/{id}/` (owner/manager) — no new endpoint.

### 3.2 Mobile bootstrap (`apps/offline/serializers.py`)

Add the same 4 fields to `BootstrapBusinessSerializer.Meta.fields`, alongside existing `currency`/`timezone`. Lets the offline app preview totals before syncing, using the same formula as section 2.

### 3.3 Sales / Reports

- `SaleSerializer` (`apps/sales/serializers.py`): add read-only `tax_rate`, `tax_inclusive` fields (snapshot values) alongside existing `tax_amount`.
- `apps.sales.services.get_sales_report()`: add `total_tax_collected` to the `summary` dict via a new `Sum("tax_amount")` aggregate over the existing `base_qs`.
- `SalesSummaryView` (`apps/sales/views.py`): **no change** — `total_tax` (`Sum("tax_amount")`) already exists in the response.

### 3.4 Sale creation input — remove client `tax_amount`

- `CreateSaleSerializer` (`apps/sales/serializers.py`): remove `tax_amount` field and `validate_tax_amount`.
- `OfflineSaleInputSerializer`: remove `tax_amount` field and `validate_tax_amount`.
- `SaleListCreateView.post()` and `_sync_one_sale()` (`apps/sales/views.py`): stop passing `tax_amount=` to `create_sale()`.

This is a clean break (no client currently relies on a working tax calculation — the field was always client-supplied and defaulted to 0). Server becomes the sole source of truth, consistent with `total_amount`/`net_amount`.

---

## 4. Migration & Rollout

- Two migrations: `tenants` (Business +4 fields), `sales` (Sale +2 fields).
- All new `Business` fields default to "tax off" (`tax_enabled=False`, `tax_rate=0`) — **zero behavior change** for existing tenants until an owner explicitly configures tax via `PATCH /api/v1/tenants/businesses/{id}/`.
- Existing `Sale` rows: `tax_amount` stays whatever it was (mostly `0`); new `tax_rate=0`, `tax_inclusive=False` — correctly represents "no tax was applied to this historical sale."
- `create_sale()` signature change (`tax_amount` param removed) — internal call sites updated in the same change (`SaleListCreateView`, `_sync_one_sale`).

---

## 5. Out of Scope (deferred)

- Per-product / per-category tax rates or tax-exempt flags (explicitly rejected — single business-wide rate).
- Multiple named tax rates (VAT + service charge, etc.) — Square/Toast-style tax catalog.
- Per-shop tax overrides (single business-wide rate covers current multi-shop model).
- Mobile app UI changes (frontend consumption of the new bootstrap fields) — backend-only per this phase.
- Admin dashboard UI for configuring tax settings — backend API only; frontend is a follow-up.
