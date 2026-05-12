# AmanaPOS — Backend

Django 5.0.6 · Django REST Framework 3.15.2 · Python 3.12

---

## Table of Contents

- [Project Layout](#project-layout)
- [Apps Reference](#apps-reference)
  - [core](#core)
  - [accounts](#accounts)
  - [tenants](#tenants)
  - [products](#products)
  - [inventory](#inventory)
  - [sales](#sales)
  - [customers](#customers)
  - [offline](#offline)
  - [subscriptions](#subscriptions)
  - [notifications](#notifications)
  - [audit_logs](#audit_logs)
  - [admin_panel](#admin_panel)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
- [Authentication & Authorisation](#authentication--authorisation)
- [Multi-Tenancy](#multi-tenancy)
- [Service Layer](#service-layer)
- [Celery Tasks & Beat Schedule](#celery-tasks--beat-schedule)
- [Storage & Image Processing](#storage--image-processing)
- [Offline-First Support](#offline-first-support)
- [Pagination, Filtering & Throttling](#pagination-filtering--throttling)
- [Settings Reference](#settings-reference)
- [Migrations](#migrations)
- [Running Tests](#running-tests)

---

## Project Layout

```
backend/
├── apps/
│   ├── accounts/       # Users, OTP, JWT auth, Bankak account
│   ├── admin_panel/    # Super-admin endpoints
│   ├── audit_logs/     # HTTP request audit middleware
│   ├── core/           # Shared base: models, exceptions, pagination, storage, image service
│   ├── customers/      # Customer management
│   ├── inventory/      # Stock levels & movements
│   ├── notifications/  # Email & SMS dispatch
│   ├── offline/        # Bootstrap & asset manifest for offline clients
│   ├── products/       # Products & categories with image upload
│   ├── sales/          # Sales, cancel, summary, offline sync
│   ├── subscriptions/  # SaaS billing plans
│   └── tenants/        # Business & shop management
├── config/
│   ├── settings/
│   │   ├── base.py     # All shared settings
│   │   ├── local.py    # Development overrides
│   │   └── production.py
│   ├── urls.py         # Root URL routing
│   ├── celery.py       # Celery application
│   ├── wsgi.py
│   └── asgi.py
└── requirements/
    ├── base.txt        # Core dependencies
    ├── local.txt       # Dev extras (debug-toolbar, etc.)
    └── production.txt  # Production-only packages
```

---

## Apps Reference

### core

Provides shared infrastructure used by every other app. No models are exposed via the API directly.

**Key modules:**

| Module | Purpose |
|---|---|
| `models/base.py` | `BaseModel` — UUID PK, `created_at`, `updated_at`, soft-delete (`is_deleted`, `deleted_at`), `SoftDeleteManager` |
| `models/tenant_model.py` | `TenantModel` — extends `BaseModel`, adds `tenant` FK to `Business` |
| `exceptions.py` | `BusinessLogicError`, `NotFound`, `PermissionDenied`, `InsufficientStockError`, `BankakAccountRequiredError`; custom DRF exception handler returning `{"success": false, "error": {"code": ..., "message": ..., "details": ...}}` |
| `pagination.py` | `StandardPagination` — 20 items/page, returns `{"count", "next", "previous", "results"}` |
| `permissions.py` | `IsOwner`, `IsManager`, `IsCashier`, `IsOwnerOrManager` role checks |
| `middleware.py` | `JsonErrorMiddleware` — converts all unhandled exceptions to JSON |
| `storage.py` | `PrivateMediaStorage`, `PublicMediaStorage` — boto3/S3 storage backends |
| `image_service.py` | `process_and_upload_image()`, `build_image_url()`, `delete_images()` — full image pipeline (validate → process → upload to MinIO) |

---

### accounts

User management and authentication.

**Models:**

| Model | Key Fields |
|---|---|
| `CustomUser` | `id` (UUID), `phone` (unique, USERNAME_FIELD), `email`, `full_name`, `role` (owner/manager/cashier), `business` FK, `default_shop` FK, `is_verified`, `has_password`, `last_login_at` |
| `BankakAccount` | `user` OneToOne FK, `phone`, `account_number`, `is_active` |

**Roles:**

| Value | Description |
|---|---|
| `owner` | Owns one or more businesses; accesses admin dashboard |
| `manager` | Manages a single business |
| `cashier` | Operates POS at a default shop |

**Public endpoints** (`/api-public/v1/auth/`):

| Method | Path | Description |
|---|---|---|
| `POST` | `login/otp/` | Request OTP for phone number |
| `POST` | `login/otp/verify/` | Verify OTP → returns JWT pair |
| `POST` | `login/password/` | Password login (admin dashboard) |
| `POST` | `resend-otp/` | Resend OTP (rate-limited: 5/min) |
| `POST` | `verify-otp/` | Standalone OTP verification |
| `POST` | `token/refresh/` | Refresh JWT access token |

**Private endpoints** (`/api/v1/auth/`):

| Method | Path | Description |
|---|---|---|
| `GET/PATCH` | `profile/` | Current user profile |
| `POST` | `set-password/` | Set/change password |
| `POST` | `logout/` | Blacklist refresh token |
| `GET/POST/PATCH/DELETE` | `bankak/` | Bankak account management |
| `POST` | `register/` | Register new user (owner flow) |

**OTP mechanics:**
- 6-digit code stored in Redis with key `otp:{phone}`, TTL 300 seconds
- 60-second cooldown enforced between resend requests
- Verified users get `is_verified = True` set on first successful verify

**Services (`accounts/services.py`):**
- `get_or_create_user(phone)` — upserts user on OTP request
- `verify_otp(phone, code)` — validates code against Redis, marks user verified
- `issue_tokens(user)` — returns SimpleJWT token pair dict

---

### tenants

Multi-tenancy foundation.

**Models:**

| Model | Key Fields |
|---|---|
| `Business` | `id` (UUID), `owner` FK to CustomUser, `name`, `slug` (unique), `address`, `phone`, `email`, `subscription` FK, `is_active` |
| `Shop` | `id` (UUID), `business` FK, `name`, `address`, `phone`, `is_main` (bool), `is_active` |

**Endpoints** (`/api/v1/tenants/`):

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `businesses/` | List owner's businesses / create business |
| `GET/PATCH/DELETE` | `businesses/<id>/` | Business detail |
| `GET/POST` | `businesses/<id>/shops/` | List/create shops |
| `GET/PATCH/DELETE` | `businesses/<id>/shops/<id>/` | Shop detail |

**Tenant resolution:**

```python
# apps/products/services.py → get_tenant_from_request(request)
if user.role == "owner":
    tenant_id = request.headers.get("X-Tenant-ID")
    return Business.objects.get(pk=tenant_id, owner=user)
else:
    return user.business  # staff always belong to one business
```

---

### products

Product catalog with image upload.

**Models:**

| Model | Key Fields |
|---|---|
| `Category` | `id` (UUID), `tenant` FK, `parent` FK (self, nullable), `name`, `description`, `image` (CharField, S3 key), `thumbnail` (CharField, S3 key), `sort_order`, `is_active` |
| `Product` | `id` (UUID), `tenant` FK, `shop` FK (optional), `category` FK, `name`, `description`, `sku` (unique per tenant), `barcode`, `price`, `cost_price`, `image` (CharField), `thumbnail` (CharField), `unit` (pcs/kg/liter/box/etc.), `track_inventory`, `min_stock_level`, `is_active` |

**Endpoints** (`/api/v1/products/`):

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `categories/` | List/create categories (multipart or JSON) |
| `GET/PATCH/DELETE` | `categories/<id>/` | Category detail |
| `GET/POST` | `` | List/create products (multipart or JSON) |
| `GET/PATCH/DELETE` | `<id>/` | Product detail |

**Image upload:** Send as `multipart/form-data` with field `image_upload`. Both JSON and multipart accepted — image field is optional. Response always returns full absolute `image` and `thumbnail_url` URLs.

---

### inventory

**Models:**

| Model | Key Fields |
|---|---|
| `StockLevel` | `product` FK, `shop` FK, `quantity` (Decimal), `updated_at` — unique together (product, shop) |
| `StockMovement` | `product` FK, `shop` FK, `quantity_change`, `movement_type` (sale/restock/adjustment/return), `reference_id`, `note`, `created_at` |
| `ProductBatch` | `product` FK, `shop` FK, `quantity`, `expiry_date`, `batch_number`, `notes`, `last_notified_date` — shop businesses only |

**Endpoints** (`/api/v1/inventory/`):

| Method | Path | Description |
|---|---|---|
| `GET` | `stock/` | List all stock levels (filterable by shop, product) |
| `GET` | `stock/<product_id>/` | Stock for a specific product across all shops |
| `POST` | `movements/` | Record a manual stock adjustment |
| `GET` | `movements/` | List stock movements (filterable by product, shop, type) |
| `GET/POST` | `batches/` | List/create product batches with expiry dates (shop only — returns 403 for restaurant) |
| `GET/PATCH/DELETE` | `batches/<id>/` | Batch detail, update, or delete |
| `GET` | `expiry-alerts/` | Returns `expiring_soon` and `expired` batch lists (shop only; respects `expiry_warning_days` setting) |

**Stock deduction:** Handled inside `create_sale()` in `apps/sales/services.py`. Each `SaleItem` calls `StockLevel.objects.select_for_update().get(product=product, shop=shop)` and deducts quantity atomically. Raises `InsufficientStockError` if stock would go negative.

---

### sales

**Models:**

| Model | Key Fields |
|---|---|
| `Sale` | `id` (UUID), `tenant` FK, `shop` FK, `cashier` FK, `customer` FK (nullable), `receipt_number` (unique), `total_amount`, `discount_amount`, `tax_amount`, `net_amount`, `payment_method`, `status`, `bankak_account_snapshot`, `notes`, `client_sale_id` (idempotency), `synced_at` |
| `SaleItem` | `sale` FK, `product` FK, `quantity`, `unit_price`, `discount`, `subtotal` |

**Payment methods:** `cash`, `bankak`, `card`, `bank_transfer`, `mobile_wallet`, `loyalty_points`, `split`, `credit`

**Sale statuses:** `pending`, `completed`, `cancelled`, `refunded`, `partial_refund`

**Endpoints** (`/api/v1/sales/`):

| Method | Path | Description |
|---|---|---|
| `GET` | `` | List sales (filterable: shop, status, cashier, receipt, date_from, date_to) |
| `POST` | `` | Create sale |
| `GET` | `<id>/` | Sale detail |
| `POST` | `<id>/cancel/` | Cancel sale and restore inventory |
| `GET` | `summary/` | Aggregate totals (total_sales, revenue, by payment method) |
| `POST` | `offline-sync/` | Batch sync offline sales |

**Receipt number format:** `{SHOP_CODE}-{YYYYMMDD}-{SEQUENCE}` — auto-generated in `create_sale()`.

**`create_sale()` service flow (atomic transaction):**
1. Validate items — look up each product by tenant
2. Calculate totals
3. For Bankak payments — fetch and snapshot the active `BankakAccount`
4. Generate `receipt_number`
5. Create `Sale` record
6. Create `SaleItem` records
7. Deduct `StockLevel` for each item (if `track_inventory=True`)
8. Create `StockMovement` audit records
9. Update customer `loyalty_points` if applicable

---

### customers

**Model:**

| Model | Key Fields |
|---|---|
| `Customer` | `id` (UUID), `tenant` FK, `name`, `phone` (unique per tenant), `email`, `loyalty_points`, `is_active` |

**Endpoints** (`/api/v1/customers/`):

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `` | List/create customers |
| `GET/PATCH/DELETE` | `<id>/` | Customer detail |

---

### offline

Provides the offline-first data bundle for mobile clients. No database models — read-only views over existing data.

**Endpoints** (`/api/v1/offline/`):

| Method | Path | Description |
|---|---|---|
| `GET` | `bootstrap/` | Full offline data bundle |
| `GET` | `assets/manifest/` | Image URL + `updated_at` manifest |

**Bootstrap response shape:**

```json
{
  "success": true,
  "server_time": "2026-05-05T10:00:00Z",
  "businesses": [...],
  "shops": [...],
  "categories": [...],
  "products": [...],
  "customers": [...],
  "stock": [{"product_id": "...", "shop_id": "...", "quantity": "10.00", "updated_at": "..."}]
}
```

Executed in 6 focused queries with `select_related` — no N+1.

**Asset manifest response shape:**

```json
{
  "success": true,
  "version": "2026-05-05",
  "assets": [
    {"id": "...", "type": "product_thumbnail", "url": "https://...", "updated_at": "..."},
    {"id": "...", "type": "product_image", "url": "https://...", "updated_at": "..."}
  ]
}
```

**Offline sync** (`POST /api/v1/sales/offline-sync/`) — see [sales](#sales) section. Each sale in the batch is processed independently; a failure returns `{"status": "failed", "message": "..."}` for that sale only and does not abort the rest.

---

### subscriptions

**Models:**

| Model | Key Fields |
|---|---|
| `Plan` | `name`, `price`, `max_shops`, `max_products`, `max_staff`, `duration_days`, `is_active` |
| `Subscription` | `business` OneToOne FK, `plan` FK, `status` (active/expired/cancelled), `starts_at`, `expires_at` |

**Celery beat task:** `check_subscription_expiry` — runs daily, marks expired subscriptions.

---

### notifications

**Model:**

| Model | Key Fields |
|---|---|
| `Notification` | `recipient` FK, `channel` (email/sms), `template_key`, `payload` (JSON), `status`, `sent_at`, `error_message` |

Notifications are dispatched via Celery tasks on the `notifications` queue. SMS provider is configurable (`SMS_PROVIDER=stub` for dev, `twilio` for production).

---

### audit_logs

**Model:**

| Model | Key Fields |
|---|---|
| `AuditLog` | `user` FK (nullable), `method`, `path`, `status_code`, `ip_address`, `user_agent`, `request_body` (sanitised), `response_time_ms`, `created_at` |

Populated by `AuditLogMiddleware` — runs on every request. Sensitive fields (`password`, `token`, `otp`) are redacted before storage.

---

### admin_panel

Super-admin views for platform management (not tenant-scoped). Restricted to `is_staff=True` users.

**Endpoints** (`/api/v1/admin/`):

| Method | Path | Description |
|---|---|---|
| `GET` | `owners/` | List all owner accounts (paginated, searchable) |
| `GET/PATCH` | `owners/<id>/` | Owner detail and update |
| `POST` | `owners/` | Create owner account |
| `GET` | `businesses/` | List all businesses across all tenants |
| `GET` | `stats/` | Platform-wide aggregate statistics |

---

## Data Models

### Inheritance Chain

```
models.Model
  └── BaseModel (UUID PK, timestamps, soft-delete)
        └── TenantModel (+ tenant FK)
              └── Product, Category, Customer, ...
```

### Key Relationships

```
Business (tenant)
  ├── owner → CustomUser
  ├── subscription → Subscription → Plan
  └── Shop (many)
        ├── Product (optional shop-level products)
        ├── StockLevel (product × shop quantity)
        └── Sale
              ├── cashier → CustomUser
              ├── customer → Customer (nullable)
              └── SaleItem (product × quantity × price)
```

---

## Authentication & Authorisation

**Authentication:** JWT Bearer tokens via `Authorization: Bearer <token>` header.

**Token lifecycle:**
- Access: 60 min (configurable via `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`)
- Refresh: 30 days (configurable via `JWT_REFRESH_TOKEN_LIFETIME_DAYS`)
- Rotation: refresh tokens are rotated and blacklisted on use
- Algorithm: HS256, signed with `SECRET_KEY`

**Permission classes:**

| Class | Condition |
|---|---|
| `IsAuthenticated` | Valid JWT required (default on all private endpoints) |
| `IsOwner` | `request.user.role == "owner"` |
| `IsManager` | `request.user.role == "manager"` |
| `IsCashier` | `request.user.role == "cashier"` |
| `IsOwnerOrManager` | Either of the above |
| `IsAdminUser` | `request.user.is_staff == True` (admin panel only) |

---

## Multi-Tenancy

All tenant-scoped querysets filter by `tenant=tenant` where `tenant` is the resolved `Business` instance.

**Tenant resolution (`get_tenant_from_request`):**
```
Owner user:
  X-Tenant-ID header → Business.objects.get(pk=header_value, owner=request.user)
  Missing/invalid header → BusinessLogicError("No active business found.")

Staff user (manager/cashier):
  request.user.business  (FK set at account creation)
  None → BusinessLogicError("No active business found.")
```

**Cross-tenant isolation:** Every queryset in every view adds `tenant=tenant` — there is no global queryset that returns data across tenants.

---

## Service Layer

Business logic lives in `services.py` files, not in views or serializers.

| App | Service | Key Functions |
|---|---|---|
| `accounts` | `services.py` | `get_or_create_user`, `verify_otp`, `issue_tokens` |
| `sales` | `services.py` | `create_sale` (atomic), `cancel_sale` (atomic) |
| `inventory` | `services.py` | `adjust_stock`, `record_movement` |
| `products` | `services.py` | `get_tenant_from_request` |
| `core` | `image_service.py` | `process_and_upload_image`, `build_image_url`, `delete_images` |

---

## Celery Tasks & Beat Schedule

**Queues:**

| Queue | Tasks |
|---|---|
| `default` | Sales post-processing, inventory updates |
| `notifications` | Email / SMS dispatch |
| `reports` | (future) report generation |

**Periodic tasks (DatabaseScheduler):**

| Task | Schedule | Purpose |
|---|---|---|
| `accounts.tasks.cleanup_expired_otps` | Every hour | Delete expired OTP keys from Redis |
| `subscriptions.tasks.check_subscription_expiry` | Daily | Mark expired subscriptions |
| `inventory.tasks.check_expiry_alerts` | Daily | Send expiry push alerts for shop businesses (skips restaurants) |
| `notifications.tasks.requeue_stuck_deliveries` | Every 5 min | Rescue stuck PROCESSING / orphaned PENDING push deliveries |

**Worker concurrency:** 4 (configurable). Prefetch multiplier: 1 (fair dispatch). `acks_late=True` (tasks only acknowledged after completion, safe for retries).

---

## Storage & Image Processing

**Two MinIO buckets:**

| Bucket | ACL | Purpose |
|---|---|---|
| `amanapos-public` | `public-read` | Product/category images (accessible without auth) |
| `amanapos-private` | `private` | User uploads, private documents |

**Image pipeline (`core/image_service.py`):**

```
Incoming file
  │
  ├── Validate: extension + magic bytes (JPEG/PNG/WebP)
  ├── Validate: file size ≤ MAX_IMAGE_UPLOAD_MB
  │
  ▼
Pillow processing:
  ├── EXIF transpose (fix orientation)
  ├── RGBA → RGB conversion
  ├── Resize: max 2048×2048 (preserve aspect ratio)
  ├── Encode: WebP (quality=85)
  └── Thumbnail: 400×400 WebP crop (ImageOps.fit)
  │
  ▼
Upload (USE_S3=True → MinIO, USE_S3=False → local media/)
  Path: businesses/{business_id}/{entity_type}/{entity_id}/original.webp
        businesses/{business_id}/{entity_type}/{entity_id}/thumbnail.webp
  │
  ▼
Return: {"image": "businesses/.../original.webp", "thumbnail": "businesses/.../thumbnail.webp"}
```

**URL building (`build_image_url`):**
- `USE_S3=True` + `MINIO_PUBLIC_URL` set → `{MINIO_PUBLIC_URL}/{bucket}/{key}`
- `USE_S3=False` + `request` available → `request.build_absolute_uri(/media/{key})` (full local URL)

---

## Offline-First Support

**`client_sale_id` idempotency:**
- Mobile generates a UUID before creating a sale offline
- On sync, the backend checks `Sale.objects.filter(tenant=tenant, client_sale_id=client_sale_id).first()`
- If found: returns the existing sale with `status: "synced"` (no duplicate created)
- `UniqueConstraint` with `condition=Q(client_sale_id__isnull=False)` enforces this at DB level (partial index, NULLs excluded for online sales)

**Batch processing:** Each sale in `offline-sync/` is wrapped in a try-except; failures are collected as `{"status": "failed"}` records — the loop always completes.

---

## Pagination, Filtering & Throttling

**Pagination:** `StandardPagination` — 20 items/page.

```json
{
  "count": 150,
  "next": "http://.../api/v1/products/?page=2",
  "previous": null,
  "results": [...]
}
```

**Filtering:** `DjangoFilterBackend` + `SearchFilter` + `OrderingFilter` on all list endpoints.

**Throttling:**

| Scope | Limit |
|---|---|
| Anonymous | 100/day |
| Authenticated user | 1000/day |
| Auth endpoints | 10/minute |
| OTP endpoints | 5/minute |

---

## Settings Reference

Key settings in `backend/config/settings/base.py`:

| Setting | Default | Description |
|---|---|---|
| `SECRET_KEY` | — | Required. Django secret key |
| `DEBUG` | `False` | Dev mode |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | List |
| `USE_S3` | `True` | Enable MinIO storage |
| `MINIO_PUBLIC_URL` | `""` | Public base URL for image URLs |
| `MAX_IMAGE_UPLOAD_MB` | `10` | Image size cap |
| `OTP_LENGTH` | `6` | OTP digit count |
| `OTP_EXPIRY_SECONDS` | `300` | OTP TTL in Redis |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | `60` | Access token TTL |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | `30` | Refresh token TTL |
| `SMS_PROVIDER` | `stub` | `stub` or `twilio` |
| `CELERY_BROKER_URL` | `redis://redis:6379/0` | Celery broker |
| `PAGE_SIZE` | `20` | DRF default page size |

---

## Migrations

```bash
# Apply all migrations
make migrate
# or inside container:
docker exec amanapos_app python manage.py migrate

# Create new migration after model changes
docker exec amanapos_app python manage.py makemigrations <app_name>

# Show migration status
docker exec amanapos_app python manage.py showmigrations
```

Migration files live in `apps/<app_name>/migrations/`. All migrations are committed to version control.

---

## Running Tests

```bash
make test          # run full test suite
make test-cov      # run with coverage report
make lint          # ruff check
make format        # ruff format
make typecheck     # mypy (if configured)
```
