# Products · Inventory · Inbound

Base path: `/api/v1/`  
Auth: `Authorization: Bearer <access_token>` required on all endpoints.  
Tenant: resolved from `X-Tenant-ID` header (owners) or from `request.user.business` (managers/cashiers).

---

## Table of Contents

- [Products](#products)
  - [Categories](#categories)
  - [Products](#products-1)
- [Inventory](#inventory)
  - [Stock Levels](#stock-levels)
  - [Stock Operations](#stock-operations)
  - [Stock Movements](#stock-movements)
  - [Batches & Expiry](#batches--expiry)
- [Inbound Receiving](#inbound-receiving) ⭐ Premium
  - [Vendors](#vendors)
  - [Inbound Transactions](#inbound-transactions)
  - [Reports & Analytics](#reports--analytics)
- [Data Models](#data-models)

---

## Products

### Categories

#### `GET /products/categories/`

List all root categories for the tenant. Children are nested inside each result.

**Permissions:** Any authenticated role.

**Response `data` item:**

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Category ID |
| `tenant` | UUID | Business ID |
| `parent` | UUID \| null | Parent category ID (null = root) |
| `name` | string | Category name |
| `description` | string | Optional description |
| `image` | string \| null | Absolute URL to full-size image |
| `thumbnail_url` | string \| null | Absolute URL to 400×400 thumbnail |
| `is_active` | bool | Soft-delete flag |
| `sort_order` | int | Display ordering |
| `created_at` | datetime | |
| `updated_at` | datetime | |

---

#### `POST /products/categories/`

Create a category. Accepts JSON or `multipart/form-data`.

**Permissions:** Any authenticated role.

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | Unique per tenant + parent combination |
| `description` | string | | |
| `parent` | UUID | | ID of an existing category; must belong to same tenant |
| `sort_order` | int | | Default `0` |
| `image_upload` | file | | JPEG / PNG / WebP, max 10 MB. Multipart only. |

---

#### `GET /products/categories/<uuid:pk>/`

Get a single category by ID.

**Permissions:** Any authenticated role.

---

#### `PATCH /products/categories/<uuid:pk>/`

Partial update. All fields optional. Same body as POST.

**Permissions:** Any authenticated role.

---

#### `DELETE /products/categories/<uuid:pk>/`

Soft-delete: sets `is_active = false`.

**Permissions:** Any authenticated role.

---

#### `GET /products/categories/<uuid:pk>/products/`

List all active products that belong to a specific category. Paginated.

**Permissions:** Any authenticated role.

**Query params:**

| Param | Description |
|---|---|
| `page` | Page number |

**Response fields:** Same as `GET /products/` product item, plus standard pagination envelope with `count`, `total_pages`, `current_page`, `next`, `previous`.

---

### Products

#### `GET /products/`

List active products for the tenant. Paginated (20 per page).

**Permissions:** Any authenticated role.

**Query params:**

| Param | Description |
|---|---|
| `category` | UUID — filter by category |
| `shop` | UUID — owner/manager: include shared + specific shop. Ignored for cashiers (they always see their default shop + shared). |
| `search` | Case-insensitive match on `name` or `sku` |
| `barcode` | Exact barcode match |
| `page` | Page number |

**Response `results` item:**

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Product ID |
| `tenant` | UUID | Business ID |
| `shop` | UUID \| null | Shop-specific product; null = shared across all shops |
| `shop_name` | string \| null | |
| `category` | UUID \| null | |
| `category_name` | string \| null | |
| `name` | string | |
| `description` | string | |
| `sku` | string | Unique per tenant |
| `barcode` | string | Unique per tenant |
| `price` | decimal | Selling price |
| `cost_price` | decimal | Purchase cost |
| `image` | string \| null | Absolute URL |
| `thumbnail_url` | string \| null | Absolute URL |
| `unit` | string | `pcs` `kg` `g` `l` `ml` `m` `box` `pack` `dozen` `other` |
| `is_active` | bool | |
| `track_inventory` | bool | Whether stock is tracked for this product |
| `min_stock_level` | int | Low-stock threshold |
| `expiry_alert_days` | int \| null | Days before expiry to alert |
| `stock_level` | int \| float \| null | Aggregated quantity across all shops |
| `created_at` | datetime | |
| `updated_at` | datetime | |

---

#### `POST /products/`

Create a product. Subscription product limit is checked before creation.

**Permissions:** Any authenticated role.

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | |
| `price` | decimal | ✅ | ≥ 0 |
| `category` | UUID | | Must belong to same tenant |
| `shop` | UUID | | Must belong to same tenant. Defaults to main shop if omitted. |
| `description` | string | | |
| `sku` | string | | Unique per tenant |
| `barcode` | string | | Unique per tenant |
| `cost_price` | decimal | | Default `0` |
| `unit` | string | | Default `pcs` |
| `track_inventory` | bool | | Default `true` |
| `min_stock_level` | int | | Default `0` |
| `expiry_alert_days` | int | | |
| `image_upload` | file | | JPEG / PNG / WebP, max 10 MB. Multipart only. |

---

#### `GET /products/<uuid:pk>/`

Get a single product.

**Permissions:** Any authenticated role.

---

#### `PATCH /products/<uuid:pk>/`

Partial update. Same body fields as POST.

**Permissions:** Any authenticated role.

---

#### `DELETE /products/<uuid:pk>/`

Soft-delete: sets `is_active = false`.

**Permissions:** Any authenticated role.

---

## Inventory

> Not available for `RESTAURANT` business type. Affected endpoints return an empty list or `403`.

### Stock Levels

#### `GET /inventory/stock/`

List current stock levels across all products and shops.

**Permissions:** Any authenticated role.

**Query params:**

| Param | Description |
|---|---|
| `shop` | UUID — filter to one shop |
| `product` | UUID — filter to one product |
| `low_stock` | `true` — only items at or below `min_stock_level` |
| `page` | Page number |

**Response `results` item:**

| Field | Type | Description |
|---|---|---|
| `id` | UUID | StockLevel ID |
| `product` | UUID | |
| `product_name` | string | |
| `product_sku` | string | |
| `shop` | UUID | |
| `shop_name` | string | |
| `quantity` | decimal | Current stock quantity |
| `is_low_stock` | bool | `quantity` ≤ `min_stock_level` and > 0 |
| `is_out_of_stock` | bool | `quantity` ≤ 0 |
| `updated_at` | datetime | Last change timestamp |

---

### Stock Operations

#### `POST /inventory/stock/add/`

Manually add stock to a product at a shop. Creates a `StockMovement` record.  
If `expiry_date` is provided, a `ProductBatch` is also created for expiry tracking.

**Permissions:** Any authenticated role.

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `product` | UUID | ✅ | Must belong to tenant |
| `shop` | UUID | ✅ | Must belong to tenant |
| `movement_type` | string | ✅ | `in` `out` `adjustment` `return` `opening` `transfer_in` `transfer_out` `sale` |
| `quantity` | decimal | ✅ | Cannot be zero |
| `reference` | string | | Reference/PO number |
| `notes` | string | | |
| `expiry_date` | date | | If set, creates a `ProductBatch` (`YYYY-MM-DD`) |
| `batch_number` | string | | Used with `expiry_date` |

**Response `data`:** StockMovement object (see [Stock Movements](#stock-movements)).

---

#### `POST /inventory/stock/adjust/`

Set stock to an exact absolute quantity (overwrites current level).

**Permissions:** Any authenticated role.

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `product` | UUID | ✅ | |
| `shop` | UUID | ✅ | |
| `new_quantity` | decimal | ✅ | ≥ 0 |
| `notes` | string | | |

**Response `data`:** StockMovement object.

---

#### `POST /inventory/stock/transfer/`

Transfer stock between two shops of the same business. Creates two `StockMovement` records (`transfer_out` + `transfer_in`).

**Permissions:** Any authenticated role.

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `product` | UUID | ✅ | |
| `from_shop` | UUID | ✅ | |
| `to_shop` | UUID | ✅ | Must differ from `from_shop` |
| `quantity` | decimal | ✅ | > 0 |
| `notes` | string | | |

**Response `data`:**

| Field | Type | Description |
|---|---|---|
| `outgoing` | StockMovement | Movement at source shop (`transfer_out`) |
| `incoming` | StockMovement | Movement at destination shop (`transfer_in`) |

---

### Stock Movements

#### `GET /inventory/movements/`

Audit log of all stock movements. Ordered by `-created_at`.

**Permissions:** Any authenticated role.

**Query params:**

| Param | Description |
|---|---|
| `product` | UUID |
| `shop` | UUID |
| `type` | Movement type: `in` `out` `adjustment` `sale` `return` `transfer_in` `transfer_out` `opening` |
| `page` | Page number |

**Response `results` item:**

| Field | Type | Description |
|---|---|---|
| `id` | UUID | |
| `product` | UUID | |
| `product_name` | string | |
| `shop` | UUID | |
| `shop_name` | string | |
| `movement_type` | string | See types above |
| `quantity` | decimal | Signed: positive = in, negative = out |
| `reference` | string | |
| `notes` | string | |
| `created_by` | UUID \| null | User ID |
| `created_by_name` | string \| null | Full name |
| `created_at` | datetime | |

---

### Batches & Expiry

#### `GET /inventory/batches/`

List product batches ordered by `expiry_date` ascending. Shop businesses only.

**Permissions:** Any authenticated role.

**Query params:**

| Param | Description |
|---|---|
| `shop` | UUID |
| `product` | UUID |
| `page` | Page number |

**Response `results` item:**

| Field | Type | Description |
|---|---|---|
| `id` | UUID | |
| `product` | UUID | |
| `product_name` | string | |
| `shop` | UUID | |
| `shop_name` | string | |
| `quantity` | decimal | |
| `expiry_date` | date | `YYYY-MM-DD` |
| `batch_number` | string | |
| `notes` | string | |
| `is_expired` | bool | Computed: `expiry_date < today` |
| `last_notified_date` | date \| null | Last push alert date |
| `created_at` | datetime | |
| `updated_at` | datetime | |

---

#### `POST /inventory/batches/`

Create a batch record for expiry tracking. Does **not** adjust stock — use `stock/add/` with `expiry_date` to do both atomically.

**Permissions:** Any authenticated role. Restaurant businesses → `403`.

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `product` | UUID | ✅ | Must belong to tenant |
| `shop` | UUID | ✅ | Must belong to tenant |
| `quantity` | decimal | ✅ | ≥ 0 |
| `expiry_date` | date | ✅ | Must be today or future |
| `batch_number` | string | | |
| `notes` | string | | |

---

#### `GET /inventory/batches/<uuid:pk>/`

Get batch detail.

**Permissions:** Any authenticated role.

---

#### `PATCH /inventory/batches/<uuid:pk>/`

Update batch. Patchable fields: `quantity`, `expiry_date`, `batch_number`, `notes`.

**Permissions:** Any authenticated role.

---

#### `DELETE /inventory/batches/<uuid:pk>/`

Hard-delete the batch record.

**Permissions:** Any authenticated role.

---

#### `GET /inventory/expiry-alerts/`

Quick summary of batches expiring soon and already expired. Uses `expiry_warning_days` setting (default 7 days).

**Permissions:** Any authenticated role.

**Response `data`:**

| Field | Type | Description |
|---|---|---|
| `expiring_soon` | ExpiryAlert[] | Batches expiring within warning window |
| `expired` | ExpiryAlert[] | Batches past expiry date |

**ExpiryAlert fields:** `id`, `product`, `product_name`, `product_sku`, `shop`, `shop_name`, `business_name`, `quantity`, `expiry_date`, `batch_number`, `is_expired`, `created_at`.

---

## Inbound Receiving

> **Premium feature** — requires the `inventory_inbound_receiving` feature flag on the active subscription plan.  
> Not available for `RESTAURANT` business type.  
> All endpoints require `manager` or `owner` role.

---

### Vendors

#### `GET /inventory/vendors/`

List vendors for the tenant. Paginated.

**Permissions:** Manager or above.

**Query params:**

| Param | Description |
|---|---|
| `search` | Matches `name`, `phone`, or `email` (case-insensitive) |
| `is_active` | `true` \| `false` |
| `page` | Page number |

**Response `results` item:**

| Field | Type | Description |
|---|---|---|
| `id` | UUID | |
| `name` | string | Unique per tenant |
| `phone` | string | |
| `email` | string | |
| `address` | string | |
| `notes` | string | |
| `is_active` | bool | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

---

#### `POST /inventory/vendors/`

Create a vendor.

**Permissions:** Manager or above.

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | Unique per tenant (case-insensitive) |
| `phone` | string | | |
| `email` | string | | |
| `address` | string | | |
| `notes` | string | | |
| `is_active` | bool | | Default `true` |

---

#### `GET /inventory/vendors/<uuid:pk>/`

Get vendor detail.

**Permissions:** Manager or above.

---

#### `PATCH /inventory/vendors/<uuid:pk>/`

Partial update. Same fields as POST.

**Permissions:** Manager or above.

---

#### `DELETE /inventory/vendors/<uuid:pk>/`

Soft-delete: sets `is_active = false`.

**Permissions:** Manager or above.

---

### Inbound Transactions

#### `GET /inventory/inbound/`

Paginated list of all inbound stock deliveries.

**Permissions:** Manager or above.

**Query params:**

| Param | Description |
|---|---|
| `vendor_id` | UUID |
| `shop_id` | UUID |
| `reference` | Partial match (case-insensitive) |
| `date_from` | `YYYY-MM-DD` — `created_at` ≥ |
| `date_to` | `YYYY-MM-DD` — `created_at` ≤ |
| `product_id` | UUID — transactions containing this product |
| `search` | Matches `reference` or `vendor.name` |
| `page` | Page number |

**Response `results` item:**

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Transaction ID |
| `reference` | string | Unique per tenant — idempotency key |
| `notes` | string | |
| `shop` | UUID | |
| `shop_name` | string | |
| `vendor` | object | `{id, name, phone}` |
| `item_count` | int | Number of product lines |
| `total_quantity` | decimal string | Sum of all item quantities |
| `items` | Item[] | See below |
| `created_by_name` | string \| null | |
| `created_at` | datetime | |

**Item object:**

| Field | Type | Description |
|---|---|---|
| `id` | UUID | |
| `product` | UUID | |
| `product_name` | string | |
| `quantity` | decimal | |
| `unit_cost` | decimal \| null | Cost per unit |
| `expiry_date` | date \| null | |
| `batch_number` | string | |

---

#### `POST /inventory/inbound/`

Record a supplier delivery. Atomically: creates `InboundTransaction`, increments `StockLevel` for each item, creates `StockMovement` records, optionally creates `ProductBatch` records if `expiry_date` is provided.

**Idempotency:** `reference` must be unique per tenant. Sending the same reference twice returns `400`.

**Permissions:** Manager or above. Premium plan required (`inventory_inbound_receiving`).

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `shop_id` | UUID | ✅ | Must belong to tenant |
| `vendor_id` | UUID | ✅ | Must belong to tenant and be active |
| `reference` | string | ✅ | Unique per tenant — use PO/GRN/delivery number |
| `notes` | string | | |
| `items` | Item[] | ✅ | At least one item required |

**Item object:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_id` | UUID | ✅ | Must belong to tenant |
| `quantity` | decimal | ✅ | > 0 |
| `unit_cost` | decimal | | Cost per unit for this delivery |
| `expiry_date` | date | | Must be today or future. Creates a `ProductBatch` if set. |
| `batch_number` | string | | |

**Response `data`:** Full `InboundTransaction` object (same shape as GET list item).

---

#### `GET /inventory/inbound/<uuid:pk>/`

Get a single inbound transaction with all items.

**Permissions:** Manager or above. Premium plan required.

---

### Reports & Analytics

#### `GET /inventory/inbound/vendor-summary/`

Aggregated inbound stats grouped by vendor.

**Permissions:** Manager or above.

**Query params:**

| Param | Description |
|---|---|
| `vendor_id` | UUID — scope to one vendor |
| `shop_id` | UUID |
| `date_from` | `YYYY-MM-DD` |
| `date_to` | `YYYY-MM-DD` |

**Response `data`:**

| Field | Type | Description |
|---|---|---|
| `total_transactions` | int | |
| `total_quantity` | decimal string | |
| `vendors` | VendorRow[] | Sorted by `transactions_count` desc |

**VendorRow:**

| Field | Type |
|---|---|
| `vendor_id` | UUID string |
| `vendor_name` | string |
| `transactions_count` | int |
| `total_quantity` | decimal string |

---

#### `GET /inventory/premium-summary/`

KPI dashboard metrics for the premium inventory screen.

**Permissions:** Manager or above. Premium plan required.

**Query params:**

| Param | Description |
|---|---|
| `shop_id` | UUID — scope all counts to one shop |

**Response `data`:**

| Field | Type | Description |
|---|---|---|
| `stock_items_count` | int | Total stock level records |
| `low_stock_count` | int | Items above 0 but at or below min level |
| `out_of_stock_count` | int | Items with quantity ≤ 0 |
| `expiring_soon_count` | int | Batches expiring within 30 days |
| `expired_count` | int | Batches past expiry |
| `active_vendors_count` | int | |
| `inbound_this_month_count` | int | Deliveries this calendar month |
| `received_quantity_this_month` | decimal string | Units received this month |

---

#### `GET /inventory/reports/expiry/`

Paginated expiry report. Premium plan required.

**Permissions:** Manager or above.

**Query params:**

| Param | Values | Description |
|---|---|---|
| `status` | `all` (default) \| `expiring_soon` \| `expired` | `expiring_soon` = within 30 days |
| `shop_id` | UUID | |
| `vendor_id` | UUID | Filters to products received from that vendor |
| `date_from` | `YYYY-MM-DD` | Expiry date ≥ |
| `date_to` | `YYYY-MM-DD` | Expiry date ≤ |
| `search` | string | Matches product name or batch number |
| `page` | int | |

**Response `results` item:**

| Field | Type | Description |
|---|---|---|
| `id` | UUID | |
| `product` | UUID | |
| `product_name` | string | |
| `product_sku` | string | |
| `shop` | UUID | |
| `shop_name` | string | |
| `batch_number` | string | |
| `quantity` | decimal | |
| `expiry_date` | date | |
| `days_remaining` | int | Negative if expired |
| `is_expired` | bool | |

---

## Data Models

### Product

| Field | Type | Constraints |
|---|---|---|
| `id` | UUID PK | auto |
| `tenant` | FK → Business | required |
| `shop` | FK → Shop \| null | optional, shop-specific products |
| `category` | FK → Category \| null | |
| `name` | varchar(255) | indexed |
| `description` | text | |
| `sku` | varchar(100) | unique per tenant |
| `barcode` | varchar(100) | unique per tenant |
| `price` | decimal(12,2) | ≥ 0 |
| `cost_price` | decimal(12,2) | ≥ 0, default 0 |
| `image` | varchar(500) \| null | S3 key |
| `thumbnail` | varchar(500) \| null | S3 key |
| `unit` | choice | `pcs` `kg` `g` `l` `ml` `m` `box` `pack` `dozen` `other` |
| `track_inventory` | bool | default `true` |
| `min_stock_level` | int | default 0 |
| `expiry_alert_days` | int \| null | |
| `is_active` | bool | soft-delete |

### Category

| Field | Type | Constraints |
|---|---|---|
| `id` | UUID PK | |
| `tenant` | FK → Business | |
| `parent` | FK → self \| null | nested categories |
| `name` | varchar(255) | unique per (tenant, parent) |
| `description` | text | |
| `image` | varchar(500) \| null | S3 key |
| `thumbnail` | varchar(500) \| null | S3 key |
| `sort_order` | int | default 0 |
| `is_active` | bool | soft-delete |

### StockLevel

| Field | Type | Constraints |
|---|---|---|
| `id` | UUID PK | |
| `product` | FK → Product | unique together with `shop` |
| `shop` | FK → Shop | |
| `quantity` | decimal(12,3) | |
| `updated_at` | datetime | auto-updated |

### StockMovement

| Field | Type | Constraints |
|---|---|---|
| `id` | UUID PK | |
| `product` | FK → Product | |
| `shop` | FK → Shop | |
| `movement_type` | choice | `in` `out` `adjustment` `sale` `return` `transfer_in` `transfer_out` `opening` |
| `quantity` | decimal(12,3) | signed |
| `reference` | varchar(255) | |
| `notes` | text | |
| `created_by` | FK → CustomUser \| null | |
| `created_at` | datetime | immutable |

### ProductBatch

| Field | Type | Constraints |
|---|---|---|
| `id` | UUID PK | |
| `product` | FK → Product | |
| `shop` | FK → Shop | |
| `quantity` | decimal(12,3) | |
| `expiry_date` | date | indexed |
| `batch_number` | varchar(100) | |
| `notes` | text | |
| `last_notified_date` | date \| null | set by Celery beat task |

### Vendor

| Field | Type | Constraints |
|---|---|---|
| `id` | UUID PK | |
| `tenant` | FK → Business | |
| `name` | varchar(255) | unique per tenant (case-insensitive) |
| `phone` | varchar(50) | |
| `email` | EmailField | |
| `address` | text | |
| `notes` | text | |
| `is_active` | bool | soft-delete |

### InboundTransaction

| Field | Type | Constraints |
|---|---|---|
| `id` | UUID PK | |
| `tenant` | FK → Business | |
| `shop` | FK → Shop | |
| `vendor` | FK → Vendor \| null | on_delete PROTECT |
| `reference` | varchar(255) | unique per tenant |
| `notes` | text | |
| `created_by` | FK → CustomUser \| null | |
| `created_at` | datetime | |

### InboundTransactionItem

| Field | Type | Constraints |
|---|---|---|
| `id` | UUID PK | |
| `transaction` | FK → InboundTransaction | cascade |
| `product` | FK → Product | |
| `quantity` | decimal(12,3) | |
| `unit_cost` | decimal(12,2) \| null | |
| `expiry_date` | date \| null | |
| `batch_number` | varchar(100) | |
