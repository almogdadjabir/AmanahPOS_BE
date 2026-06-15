# AmanaPOS — Stock Management

Django 5 · Django REST Framework · Multi-tenant · Offline-capable

---

## Table of Contents

- [Product Lifecycle Overview](#product-lifecycle-overview)
- [Data Models](#data-models)
- [Movement Types](#movement-types)
- [Product APIs](#product-apis)
- [Stock APIs](#stock-apis)
- [Inbound Receiving APIs (Premium)](#inbound-receiving-apis-premium)
- [Vendor APIs](#vendor-apis)
- [Batch & Expiry APIs](#batch--expiry-apis)
- [Sales — Stock Deduction](#sales--stock-deduction)
- [Full Product Lifecycle](#full-product-lifecycle)
- [Stock Tracking Reference](#stock-tracking-reference)

---

## Product Lifecycle Overview

```
CREATE PRODUCT
      │
      ▼
OPEN STOCK  ←─────────────────────────────┐
  add_stock() / inbound_receive()          │  Return / Cancel
  movement_type: IN or OPENING            │  movement_type: RETURN
      │                                    │
      ▼                                    │
STOCK LEVEL MAINTAINED               ┌────┴────┐
  StockLevel.quantity                 │  CANCEL │
      │                               └────┬────┘
      ├── Manual adjustment                │
      │   adjust_stock()                   │
      │   movement_type: ADJUSTMENT        │
      │                                    │
      ├── Transfer between shops           │
      │   transfer_stock()                 │
      │   movement_type: TRANSFER_OUT/IN   │
      │                                    │
      ▼                               ┌────┴────┐
CREATE SALE ──────────────────────────► SALE     │
  create_sale()                        │  REFUND │
  movement_type: SALE                  └─────────┘
      │
      ▼
STOCK DEDUCTED
  StockMovement record created
  StockLevel.quantity decremented
```

---

## Data Models

### Product

```
Product
├── id              UUID (PK)
├── tenant          FK → Business
├── shop            FK → Shop (null = shared across all shops)
├── category        FK → Category (optional)
├── name            string
├── sku             string (unique per tenant)
├── barcode         string
├── price           decimal
├── cost_price      decimal (default 0)
├── unit            pcs | kg | g | l | ml | m | box | pack | dozen | other
├── track_inventory boolean (default true)
├── min_stock_level integer (default 0) — triggers low_stock filter
├── expiry_alert_days integer (optional) — days before expiry to alert
├── image           S3 key (original)
└── thumbnail       S3 key (400×400 crop)
```

### StockLevel

One record per (product × shop). This is the live, current quantity.

```
StockLevel
├── id        UUID (PK)
├── product   FK → Product
├── shop      FK → Shop
├── quantity  decimal(12,3)
└── updated_at datetime
```

### StockMovement

Immutable audit log — every quantity change creates one record here.

```
StockMovement
├── id            UUID (PK)
├── product       FK → Product
├── shop          FK → Shop
├── movement_type string (see Movement Types)
├── quantity      decimal(12,3) — negative for deductions
├── reference     string (receipt number, inbound reference, etc.)
├── notes         string
├── created_by    FK → CustomUser (nullable)
└── created_at    datetime (immutable)
```

### ProductBatch

Optional expiry tracking — one row per batch received.

```
ProductBatch
├── id                 UUID (PK)
├── product            FK → Product
├── shop               FK → Shop
├── quantity           decimal(12,3)
├── expiry_date        date (indexed)
├── batch_number       string
├── notes              string
└── last_notified_date date (set when expiry alert was sent)
```

### InboundTransaction

Header record for a supplier delivery (premium feature).

```
InboundTransaction
├── id          UUID (PK)
├── tenant      FK → Business
├── shop        FK → Shop
├── vendor      FK → Vendor (optional)
├── reference   string (unique per tenant — idempotency key)
├── notes       string
├── created_by  FK → CustomUser
└── created_at  datetime
```

### InboundTransactionItem

One row per product line in a delivery.

```
InboundTransactionItem
├── id            UUID (PK)
├── transaction   FK → InboundTransaction
├── product       FK → Product
├── quantity      decimal(12,3)
├── unit_cost     decimal(12,2) (optional)
├── expiry_date   date (optional)
└── batch_number  string (optional)
```

### Vendor

Supplier record.

```
Vendor
├── id        UUID (PK)
├── tenant    FK → Business
├── name      string (unique per tenant)
├── phone     string
├── email     string
├── address   string
├── notes     string
└── is_active boolean
```

---

## Movement Types

| Type | When Created | Quantity Sign |
|------|-------------|---------------|
| `in` | Manual stock add | + positive |
| `opening` | Opening stock entry | + positive |
| `out` | Manual stock removal | − negative |
| `adjustment` | Set stock to absolute value | ± difference |
| `sale` | `create_sale()` for each item | − negative |
| `return` | `cancel_sale()` or `process_refund()` | + positive |
| `transfer_in` | `transfer_stock()` — receiving shop | + positive |
| `transfer_out` | `transfer_stock()` — sending shop | − negative |

---

## Product APIs

Base URL: `/api/v1/products/`

All endpoints require `Authorization: Bearer <token>`.

---

### List Products

```
GET /api/v1/products/
```

Query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `category` | UUID | Filter by category |
| `shop` | UUID | Filter by shop |
| `search` | string | Search name or SKU |
| `barcode` | string | Exact barcode match |

Cashiers automatically see only their default shop's products + shared products.

Response:
```json
{
  "count": 42,
  "next": "...",
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "name": "Milk 1L",
      "sku": "MLK-001",
      "barcode": "6281234567890",
      "price": "2.50",
      "cost_price": "1.80",
      "unit": "pcs",
      "track_inventory": true,
      "min_stock_level": 10,
      "stock_level": 45,
      "image": "https://...",
      "thumbnail_url": "https://...",
      "category": { "id": "uuid", "name": "Dairy" },
      "shop": null
    }
  ]
}
```

---

### Create Product

```
POST /api/v1/products/
Content-Type: multipart/form-data  OR  application/json
```

Body:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Product name |
| `price` | yes | Selling price |
| `category` | no | Category UUID |
| `shop` | no | Shop UUID (null = shared across all shops) |
| `sku` | no | Stock Keeping Unit (auto-generated if blank) |
| `barcode` | no | Barcode string |
| `cost_price` | no | Cost price (default 0) |
| `unit` | no | `pcs` / `kg` / `g` / `l` / `ml` / `m` / `box` / `pack` / `dozen` / `other` |
| `track_inventory` | no | Whether to track stock (default true) |
| `min_stock_level` | no | Alert threshold (default 0) |
| `expiry_alert_days` | no | Days before expiry to alert |
| `image_upload` | no | Image file (JPEG/PNG/WebP, max 10 MB) |

---

### Get / Update / Delete Product

```
GET    /api/v1/products/<uuid>/
PATCH  /api/v1/products/<uuid>/
DELETE /api/v1/products/<uuid>/    ← soft-delete (is_active = false)
```

---

### Categories

```
GET    /api/v1/products/categories/
POST   /api/v1/products/categories/
GET    /api/v1/products/categories/<uuid>/
PATCH  /api/v1/products/categories/<uuid>/
DELETE /api/v1/products/categories/<uuid>/         ← soft-delete
GET    /api/v1/products/categories/<uuid>/products/ ← products in category
```

---

## Stock APIs

Base URL: `/api/v1/inventory/`

All endpoints require `Authorization: Bearer <token>`.

---

### View Current Stock Levels

```
GET /api/v1/inventory/stock/
```

Query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `shop` | UUID | Filter by shop |
| `product` | UUID | Filter by product |
| `low_stock` | boolean | Only items at or below `min_stock_level` |

Response:
```json
{
  "count": 10,
  "results": [
    {
      "product_id": "uuid",
      "product_name": "Milk 1L",
      "shop_id": "uuid",
      "shop_name": "Main Branch",
      "quantity": "45.000",
      "min_stock_level": 10,
      "is_low_stock": false,
      "updated_at": "2026-06-01T10:00:00Z"
    }
  ]
}
```

---

### Add Stock (Manual)

```
POST /api/v1/inventory/stock/add/
```

Body:

| Field | Required | Description |
|-------|----------|-------------|
| `product` | yes | Product UUID |
| `shop` | yes | Shop UUID |
| `quantity` | yes | Amount to add (positive) |
| `reference` | no | Free-text reference |
| `notes` | no | Notes |
| `expiry_date` | no | If provided, creates a ProductBatch record |
| `batch_number` | no | Batch identifier for the expiry record |

Creates a `StockMovement` with `movement_type: in`.

---

### Adjust Stock (Set Absolute)

```
POST /api/v1/inventory/stock/adjust/
```

Body:

| Field | Required | Description |
|-------|----------|-------------|
| `product` | yes | Product UUID |
| `shop` | yes | Shop UUID |
| `new_quantity` | yes | Target quantity (replaces current) |
| `notes` | no | Reason for adjustment |

Creates a `StockMovement` with `movement_type: adjustment`. Quantity in movement is the delta (new − old).

---

### Transfer Stock Between Shops

```
POST /api/v1/inventory/stock/transfer/
```

Body:

| Field | Required | Description |
|-------|----------|-------------|
| `product` | yes | Product UUID |
| `from_shop` | yes | Source shop UUID |
| `to_shop` | yes | Destination shop UUID |
| `quantity` | yes | Amount to transfer |
| `notes` | no | Notes |

Creates two `StockMovement` records atomically:
- `transfer_out` on the source shop
- `transfer_in` on the destination shop

---

### View Movement History

```
GET /api/v1/inventory/movements/
```

Query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `product` | UUID | Filter by product |
| `shop` | UUID | Filter by shop |
| `type` | string | Filter by `movement_type` |

Returns newest-first audit log of all stock changes.

Response:
```json
{
  "results": [
    {
      "id": "uuid",
      "product_name": "Milk 1L",
      "shop_name": "Main Branch",
      "movement_type": "sale",
      "quantity": "-2.000",
      "reference": "MAIN-20260601-0042",
      "notes": "Sale MAIN-20260601-0042",
      "created_by": "Ali Hassan",
      "created_at": "2026-06-01T11:30:00Z"
    }
  ]
}
```

---

## Inbound Receiving APIs (Premium)

> **Requires:** subscription plan with `inventory_inbound_receiving: true`
> **Role:** owner or manager only

This is the structured way to receive supplier deliveries. One call creates the `InboundTransaction` header, all `InboundTransactionItem` lines, increments `StockLevel` for each product, and optionally creates `ProductBatch` records for items with expiry dates.

```
GET    /api/v1/inventory/inbound/
POST   /api/v1/inventory/inbound/
GET    /api/v1/inventory/inbound/<uuid>/
GET    /api/v1/inventory/inbound/vendor-summary/
```

---

### Create Inbound Transaction

```
POST /api/v1/inventory/inbound/
```

Body:

| Field | Required | Description |
|-------|----------|-------------|
| `shop` | yes | Shop UUID receiving the delivery |
| `reference` | yes | Unique delivery reference per tenant (e.g. `INV-2026-001`) |
| `vendor` | no | Vendor UUID |
| `notes` | no | Notes |
| `items` | yes | Array of item objects (see below) |

Item object:

| Field | Required | Description |
|-------|----------|-------------|
| `product` | yes | Product UUID |
| `quantity` | yes | Quantity received |
| `unit_cost` | no | Cost per unit for this delivery |
| `expiry_date` | no | Creates a ProductBatch if provided |
| `batch_number` | no | Batch identifier |

Example:
```json
{
  "shop": "uuid",
  "reference": "PO-2026-0045",
  "vendor": "uuid",
  "notes": "Weekly delivery from supplier",
  "items": [
    {
      "product": "uuid",
      "quantity": 100,
      "unit_cost": "1.80",
      "expiry_date": "2026-12-31",
      "batch_number": "BATCH-A"
    },
    {
      "product": "uuid",
      "quantity": 50,
      "unit_cost": "3.20"
    }
  ]
}
```

**Idempotency:** Sending the same `reference` twice returns HTTP 400. The DB constraint `unique(tenant, reference)` enforces this.

Creates:
- 1 `InboundTransaction` record
- N `InboundTransactionItem` records
- N `StockMovement` records with `movement_type: in`
- `ProductBatch` record for each item that had `expiry_date`

---

### List Inbound Transactions

```
GET /api/v1/inventory/inbound/
```

Query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `shop_id` | UUID | Filter by shop |
| `vendor_id` | UUID | Filter by vendor |
| `reference` | string | Search by reference |
| `product_id` | UUID | Filter transactions containing a product |
| `search` | string | Full-text search |
| `date_from` | date | Start date (YYYY-MM-DD) |
| `date_to` | date | End date (YYYY-MM-DD) |

---

### Vendor Summary

```
GET /api/v1/inventory/inbound/vendor-summary/
```

Query parameters: `vendor_id`, `shop_id`, `date_from`, `date_to`

Returns aggregated inbound stats per vendor (total deliveries, total units, total cost value).

---

## Vendor APIs

```
GET    /api/v1/inventory/vendors/              ?search=&is_active=
POST   /api/v1/inventory/vendors/
GET    /api/v1/inventory/vendors/<uuid>/
PATCH  /api/v1/inventory/vendors/<uuid>/
DELETE /api/v1/inventory/vendors/<uuid>/       ← soft-delete (is_active = false)
```

Vendor body:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Vendor name (unique per tenant) |
| `phone` | no | Phone number |
| `email` | no | Email address |
| `address` | no | Physical address |
| `notes` | no | Internal notes |

---

## Batch & Expiry APIs

```
GET    /api/v1/inventory/batches/              ?shop=&product=
POST   /api/v1/inventory/batches/
GET    /api/v1/inventory/batches/<uuid>/
PATCH  /api/v1/inventory/batches/<uuid>/
DELETE /api/v1/inventory/batches/<uuid>/
GET    /api/v1/inventory/expiry-alerts/
GET    /api/v1/inventory/reports/expiry/
```

---

### Create Batch

```
POST /api/v1/inventory/batches/
```

Body:

| Field | Required | Description |
|-------|----------|-------------|
| `product` | yes | Product UUID |
| `shop` | yes | Shop UUID |
| `quantity` | yes | Batch quantity |
| `expiry_date` | yes | Expiry date (YYYY-MM-DD) |
| `batch_number` | no | Batch identifier |
| `notes` | no | Notes |

---

### Expiry Alerts

```
GET /api/v1/inventory/expiry-alerts/
```

Returns two lists:

```json
{
  "expiring_soon": [
    {
      "batch_id": "uuid",
      "product_name": "Milk 1L",
      "shop_name": "Main Branch",
      "quantity": "20.000",
      "expiry_date": "2026-06-08",
      "days_remaining": 6,
      "batch_number": "BATCH-A"
    }
  ],
  "expired": [...]
}
```

Alert threshold is `expiry_warning_days` (default 7 days). Runs daily via Celery beat.

---

### Expiry Report (Premium)

```
GET /api/v1/inventory/reports/expiry/
```

Query parameters:

| Param | Values | Description |
|-------|--------|-------------|
| `status` | `expiring_soon` / `expired` / `all` | Filter by expiry status |
| `shop_id` | UUID | Filter by shop |
| `vendor_id` | UUID | Filter by vendor |
| `date_from` | date | Expiry date range start |
| `date_to` | date | Expiry date range end |
| `search` | string | Search by product name or batch number |

---

## Sales — Stock Deduction

Stock is deducted automatically when a sale is created via `POST /api/v1/sales/`.

### What happens per item in `create_sale()`:

```
1. Look up product by UUID, scoped to tenant
2. If business_type == RESTAURANT → skip inventory entirely
3. If product.track_inventory OR StockLevel record exists:
     deduct_stock(
         product, shop, quantity,
         reference = receipt_number,
         notes = "Sale {receipt_number}",
         created_by = cashier,
         movement_type = "sale",
         allow_negative = not product.track_inventory
     )
4. Creates StockMovement with movement_type: sale
5. Decrements StockLevel.quantity atomically (select_for_update)
```

`allow_negative=True` only when `track_inventory=False` — untracked products can go below zero without error.

### Sale Cancellation

```
POST /api/v1/sales/<uuid>/cancel/
```

Restores stock via `add_stock()` with `movement_type: return`.

### Refund

```
POST /api/v1/sales/<uuid>/refund/
```

Restores stock for refunded items via `add_stock()` with `movement_type: return`.
Reference format: `{receipt_number}-R1`, `{receipt_number}-R2`, etc.

---

## Full Product Lifecycle

Below is the complete sequence from creating a product to tracking its full stock history.

### Step 1 — Create the product

```
POST /api/v1/products/
{
  "name": "Milk 1L",
  "price": "2.50",
  "cost_price": "1.80",
  "unit": "pcs",
  "track_inventory": true,
  "min_stock_level": 10
}
→ Product created, no StockLevel record yet
```

### Step 2 — Open stock (first stock entry)

```
POST /api/v1/inventory/stock/add/
{
  "product": "<uuid>",
  "shop": "<uuid>",
  "quantity": 100,
  "reference": "OPENING",
  "notes": "Initial stock"
}
→ StockLevel: quantity = 100
→ StockMovement: type=in, quantity=+100, reference="OPENING"
```

### Step 3 — Supplier delivery (Inbound Receive — Premium)

```
POST /api/v1/inventory/inbound/
{
  "shop": "<uuid>",
  "reference": "PO-2026-0001",
  "vendor": "<uuid>",
  "items": [
    {"product": "<uuid>", "quantity": 200, "unit_cost": "1.80", "expiry_date": "2026-12-31"}
  ]
}
→ StockLevel: quantity = 300
→ StockMovement: type=in, quantity=+200, reference="PO-2026-0001"
→ ProductBatch: quantity=200, expiry_date="2026-12-31"
→ InboundTransaction + InboundTransactionItem records created
```

### Step 4 — Transfer to another shop

```
POST /api/v1/inventory/stock/transfer/
{
  "product": "<uuid>",
  "from_shop": "<main-shop-uuid>",
  "to_shop": "<branch-uuid>",
  "quantity": 50
}
→ StockLevel (main):   quantity = 250
→ StockLevel (branch): quantity = 50
→ StockMovement (main):   type=transfer_out, quantity=−50
→ StockMovement (branch): type=transfer_in,  quantity=+50
```

### Step 5 — Sale

```
POST /api/v1/sales/
{
  "shop": "<branch-uuid>",
  "items": [{"product": "<uuid>", "quantity": 3, "unit_price": "2.50"}],
  "payment_method": "cash"
}
→ StockLevel (branch): quantity = 47
→ StockMovement: type=sale, quantity=−3, reference="BRANCH-20260601-0001"
→ Sale + SaleItem records created
```

### Step 6 — Inventory adjustment (stocktake)

```
POST /api/v1/inventory/stock/adjust/
{
  "product": "<uuid>",
  "shop": "<branch-uuid>",
  "new_quantity": 45,
  "notes": "Stocktake 2026-06-01 — 2 damaged"
}
→ StockLevel (branch): quantity = 45
→ StockMovement: type=adjustment, quantity=−2, notes="Stocktake..."
```

### Step 7 — Sale cancelled

```
POST /api/v1/sales/<sale-uuid>/cancel/
→ StockLevel (branch): quantity = 48
→ StockMovement: type=return, quantity=+3, reference="BRANCH-20260601-0001"
```

### Step 8 — View full audit trail

```
GET /api/v1/inventory/movements/?product=<uuid>&shop=<branch-uuid>
→ Returns all 4 movements above in reverse chronological order
```

---

## Stock Tracking Reference

### All Stock Service Functions

| Function | Endpoint that calls it | Movement Type |
|----------|----------------------|---------------|
| `add_stock()` | `POST /inventory/stock/add/` | `in` |
| `add_stock()` | `POST /sales/<id>/cancel/` | `return` |
| `add_stock()` | `POST /sales/<id>/refund/` | `return` |
| `deduct_stock()` | `POST /sales/` (per item) | `sale` |
| `adjust_stock()` | `POST /inventory/stock/adjust/` | `adjustment` |
| `transfer_stock()` | `POST /inventory/stock/transfer/` | `transfer_out` + `transfer_in` |
| `inbound_receive()` | `POST /inventory/inbound/` | `in` |

### All Inventory Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/inventory/stock/` | any role | List current stock levels |
| POST | `/api/v1/inventory/stock/add/` | any role | Add stock manually |
| POST | `/api/v1/inventory/stock/adjust/` | any role | Set stock to absolute quantity |
| POST | `/api/v1/inventory/stock/transfer/` | any role | Transfer between shops |
| GET | `/api/v1/inventory/movements/` | any role | Full movement audit log |
| GET | `/api/v1/inventory/batches/` | any role | List product batches |
| POST | `/api/v1/inventory/batches/` | any role | Create batch manually |
| GET | `/api/v1/inventory/batches/<uuid>/` | any role | Batch detail |
| PATCH | `/api/v1/inventory/batches/<uuid>/` | any role | Update batch |
| DELETE | `/api/v1/inventory/batches/<uuid>/` | any role | Delete batch |
| GET | `/api/v1/inventory/expiry-alerts/` | any role | Expiring / expired batches |
| GET | `/api/v1/inventory/inbound/` ★ | manager / owner | List inbound transactions |
| POST | `/api/v1/inventory/inbound/` ★ | manager / owner | Record supplier delivery |
| GET | `/api/v1/inventory/inbound/<uuid>/` ★ | manager / owner | Inbound detail |
| GET | `/api/v1/inventory/inbound/vendor-summary/` ★ | manager / owner | Stats by vendor |
| GET | `/api/v1/inventory/vendors/` ★ | manager / owner | List vendors |
| POST | `/api/v1/inventory/vendors/` ★ | manager / owner | Create vendor |
| GET | `/api/v1/inventory/vendors/<uuid>/` ★ | manager / owner | Vendor detail |
| PATCH | `/api/v1/inventory/vendors/<uuid>/` ★ | manager / owner | Update vendor |
| DELETE | `/api/v1/inventory/vendors/<uuid>/` ★ | manager / owner | Soft-delete vendor |
| GET | `/api/v1/inventory/premium-summary/` ★ | manager / owner | KPI dashboard |
| GET | `/api/v1/inventory/reports/expiry/` ★ | manager / owner | Paginated expiry report |

★ Premium feature (`inventory_inbound_receiving`) — requires qualifying subscription plan.

### All Product Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/products/` | List products |
| POST | `/api/v1/products/` | Create product |
| GET | `/api/v1/products/<uuid>/` | Product detail |
| PATCH | `/api/v1/products/<uuid>/` | Update product |
| DELETE | `/api/v1/products/<uuid>/` | Soft-delete product |
| GET | `/api/v1/products/categories/` | List categories |
| POST | `/api/v1/products/categories/` | Create category |
| GET | `/api/v1/products/categories/<uuid>/` | Category detail |
| PATCH | `/api/v1/products/categories/<uuid>/` | Update category |
| DELETE | `/api/v1/products/categories/<uuid>/` | Soft-delete category |
| GET | `/api/v1/products/categories/<uuid>/products/` | Products in category |
