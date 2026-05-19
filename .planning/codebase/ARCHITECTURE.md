<!-- refreshed: 2026-05-19 -->
# Architecture

**Analysis Date:** 2026-05-19

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    Clients                                           │
│   Mobile POS App       Admin Dashboard (Next.js)   Landing Page     │
│   (offline-capable)    /admin/src/                 /landing_page/   │
└──────────┬─────────────────────┬────────────────────────────────────┘
           │  JWT Bearer          │  JWT Bearer + cookie
           ▼                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Django REST Framework API                         │
│   Public: /api-public/v1/    Private: /api/v1/                      │
│   backend/config/urls.py                                            │
└──────────┬───────────────────────────────────────────────────────────┘
           │
    ┌──────┴────────────────────────────────────────────┐
    │          Django Apps (backend/apps/)               │
    │  accounts  tenants  products  inventory  sales     │
    │  customers  subscriptions  notifications  offline  │
    │  admin_panel  activity_logs  audit_logs  core      │
    └──────┬────────────────────────────────────────────┘
           │
    ┌──────┴──────────────┐
    │   Infrastructure    │
    │  PostgreSQL          │ ← Primary data store (single public schema)
    │  Redis (DB 0)        │ ← Cache + sessions + OTP storage
    │  Redis (DB 1)        │ ← Celery broker
    │  Redis (DB 2)        │ ← Celery results
    │  MinIO (S3-compat.)  │ ← Media files (private + public buckets)
    │  Celery workers      │ ← Async tasks (notifications, cleanup)
    │  Celery Beat         │ ← Scheduled tasks (DB-backed scheduler)
    └─────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Path |
|-----------|----------------|------|
| `accounts` | Auth, users, OTP login, Bankak accounts | `backend/apps/accounts/` |
| `tenants` | Business + Shop multi-tenancy | `backend/apps/tenants/` |
| `products` | Product catalog, categories | `backend/apps/products/` |
| `inventory` | Stock levels, movements, batches, vendors | `backend/apps/inventory/` |
| `sales` | Sale creation, offline sync, refunds, dashboard | `backend/apps/sales/` |
| `customers` | Customer records, loyalty points | `backend/apps/customers/` |
| `subscriptions` | Plans, subscriptions, resource limits | `backend/apps/subscriptions/` |
| `notifications` | Push (FCM), in-app notifications, device tokens | `backend/apps/notifications/` |
| `offline` | Bootstrap payload + asset manifest for mobile | `backend/apps/offline/` |
| `admin_panel` | Super-admin CRUD for owners, businesses, plans | `backend/apps/admin_panel/` |
| `activity_logs` | API activity log queryable by admin | `backend/apps/activity_logs/` |
| `audit_logs` | Middleware-driven audit trail of mutations | `backend/apps/audit_logs/` |
| `core` | Shared utilities, exceptions, permissions, pagination | `backend/apps/core/` |

## Pattern Overview

**Overall:** Django monolith with a service layer pattern. Views own HTTP and serialization; services own business logic.

**Key Characteristics:**
- All views are class-based `APIView` (no ViewSets or Routers)
- Business logic lives exclusively in `services.py` per app
- All mutating service functions use `@transaction.atomic` or explicit `with transaction.atomic()`
- Single PostgreSQL schema (`public`) — no separate schemas per tenant
- Tenant isolation enforced in code via `tenant` FK on every resource queryset

## Multi-Tenancy Model

**Isolation strategy:** Shared-schema, application-level tenant scoping.

Every resource model carries a `tenant` FK to `tenants.Business`:
- `Sale.tenant` → `backend/apps/sales/models/sale.py`
- `Product.tenant` → `backend/apps/products/models/product.py`
- `Customer.tenant` → `backend/apps/customers/models/`

The `Business` model (`backend/apps/tenants/models/business.py`) is the tenant root:
- One owner (`CustomUser` with `role="owner"`) → one or more `Business` records
- Each `Business` → one or more `Shop` records
- Staff (`manager`, `cashier`) belong to exactly one `Business` via `CustomUser.business` FK

**Tenant resolution pattern** — used across all apps via `get_tenant_from_request()`:
```python
# backend/apps/products/services.py
def get_tenant_from_request(request):
    user = request.user
    if user.role != "owner":
        return user.business           # staff: single business, from user FK
    tenant_id = request.headers.get("X-Tenant-ID") or request.query_params.get("tenant_id")
    if tenant_id:
        return Business.objects.filter(pk=tenant_id, owner=user, is_active=True).first()
    return Business.objects.filter(owner=user, is_active=True).first()
```

Owners pass `X-Tenant-ID` header (or `tenant_id` query param) to scope requests to one of their businesses.

**Subscription limits** enforced at write time via guards:
```python
# backend/apps/subscriptions/guards.py
check_shop_limit(business)    # raises SubscriptionLimitError (422) if over quota
check_user_limit(business)
check_product_limit(business)
require_feature(business, "feature_key")
```
Plan limits: `max_shops`, `max_products`, `max_users` (0 = unlimited), `features` JSON field.

## Authentication & Authorization

**Auth method:** Phone-number-based, no email login for app users.

**Login flows:**
1. OTP login (primary): `POST /api-public/v1/auth/login/otp/` → request OTP → `POST /api-public/v1/auth/login/otp/verify/` → returns JWT pair
2. Password login (optional): `POST /api-public/v1/auth/login/password/` — only if user has `has_password=True`

**JWT configuration** (`backend/config/settings/base.py`):
- Algorithm: HS256
- Access token: 60 min (configurable via `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`)
- Refresh token: 30 days (configurable via `JWT_REFRESH_TOKEN_LIFETIME_DAYS`)
- Rotation on refresh: `ROTATE_REFRESH_TOKENS = True`, `BLACKLIST_AFTER_ROTATION = True`
- Blacklist stored in `rest_framework_simplejwt.token_blacklist`

**User roles** (`backend/apps/accounts/models/user.py`):
- `owner` — full access to own businesses; resolved via `X-Tenant-ID` header
- `manager` — scoped to assigned business; full CRUD except user management
- `cashier` — scoped to assigned shop; restricted to sale creation, dashboard

**Permission classes** (`backend/apps/core/permissions.py`):
- `IsOwner` — role must be `"owner"`, object-level checks `obj.owner == request.user` or `obj.tenant.owner == request.user`
- `IsManagerOrAbove` — role in `("manager", "owner")`
- `IsCashierOrAbove` — any role
- `HasBusiness` — owner must have created a `Business` record
- `IsTenantMember` — object's `tenant_id` or `business_id` matches user's `business_id`
- `IsVerified` — `user.is_verified == True`

**Throttle rates** (from base settings):
- `anon`: 100/day
- `user`: 10,000/day
- `auth`: 10/min
- `otp`: 5/min

**OTP storage:** OTPs are stored in Redis (not the database). Key format: `otp:{phone}:{channel}` (hashed). Expiry: 300 seconds. Max attempts: 5. Resend cooldown: 60 seconds. Providers: `stub` (dev) or `twilio_messaging` (SMS + WhatsApp via `backend/apps/accounts/otp/providers.py`).

**Admin dashboard auth** (`admin/` Next.js app) uses cookie-based JWT storage with a token refresh proxy at `admin/src/app/api/auth/refresh/`.

## Service Layer Pattern

Views delegate all business logic to `services.py`. This is enforced convention:

```
View (apps/{app}/views.py)
  │  validates HTTP input via serializer
  │  resolves tenant
  │  calls service function
  ▼
Service (apps/{app}/services.py)
  │  @transaction.atomic
  │  validates business rules
  │  creates/updates models
  │  calls other app services (cross-app calls are direct imports)
  ▼
Models (apps/{app}/models/)
```

Example — sale creation call chain:
- `SaleListCreateView.post()` (`backend/apps/sales/views.py`) → `create_sale()` (`backend/apps/sales/services.py`) → `deduct_stock()` (`backend/apps/inventory/services.py`) → `StockMovement.save()` → `update_stock_level` signal → `StockLevel` updated

Cross-app service calls use direct Python imports (no message bus). The apps that are commonly imported from other apps:
- `apps.inventory.services` — `deduct_stock`, `add_stock` called from `apps.sales.services`
- `apps.products.services` — `get_tenant_from_request` used in nearly every app's views
- `apps.subscriptions.guards` — `check_*_limit` called from `apps.accounts.views`, `apps.tenants.views`, `apps.products.views`
- `apps.notifications.services` — `notify_user()` called from login view and signals

## Key Data Flows

### Sale Creation (online)

1. `POST /api/v1/sales/` → `SaleListCreateView.post()` (`backend/apps/sales/views.py`)
2. `get_tenant_from_request(request)` resolves active `Business`
3. `CreateSaleSerializer` validates input
4. `Shop.objects.get(pk=data["shop"], business=tenant)` validates shop belongs to tenant
5. `create_sale(tenant, shop, cashier, items, ...)` (`backend/apps/sales/services.py`) — wraps entire operation in `@transaction.atomic`
6. For each item: `Product.objects.select_for_update().get(pk=..., tenant=tenant)` — row-locks product
7. Bankak payment: `get_default_bankak_account(tenant.owner)` — must exist or raises `BankakAccountRequiredError`
8. `Sale.objects.create(...)` — receipt number generated via `generate_receipt_number("REC")`
9. `SaleItem.objects.create(...)` per item
10. `deduct_stock(product, shop, quantity, ...)` (`backend/apps/inventory/services.py`) — creates `StockMovement`
11. `update_stock_level` signal fires → updates `StockLevel.quantity` with `select_for_update()`
12. If low stock: `send_low_stock_notification.delay(...)` queued to Celery `notifications` queue
13. If customer: `_award_loyalty_points(customer, net_amount)` — 1 point per 10 currency units

### OTP Login

1. `POST /api-public/v1/auth/login/otp/` → `LoginOTPRequestView.post()` (`backend/apps/accounts/views.py`)
2. `request_login_otp(phone, channel)` (`backend/apps/accounts/services.py`)
3. Validates channel in `OTP_ALLOWED_CHANNELS` (`sms`, `whatsapp`)
4. Checks per-channel Redis cooldown (`OTP_RESEND_COOLDOWN_SECONDS`)
5. `generate_otp()` → `store_channel_otp(phone, otp, channel)` → stores hashed OTP in Redis
6. `get_otp_sender().send_otp(phone, otp, channel)` → `StubOtpSender` or `TwilioMessagingOtpSender` (`backend/apps/accounts/otp/providers.py`)
7. `POST /api-public/v1/auth/login/otp/verify/` → `LoginOTPVerifyView.post()`
8. `verify_login_otp(phone, otp, channel)` — checks attempt count, verifies hash, deletes OTP from Redis
9. On success: stamps `user.is_verified = True`, `user.last_login_at`
10. `get_tokens_for_user(user)` → returns JWT access + refresh pair
11. If `fcm_token` provided: `DeviceToken.objects.update_or_create(...)` registers device for push
12. First-login or new-device: `notify_user(user, **render_notification("welcome"))` queued

### Offline Sale Sync

1. Mobile app buffers sales locally with client-generated UUIDs (`client_sale_id`)
2. `POST /api/v1/sales/offline-sync/` → `OfflineSyncView.post()` (`backend/apps/sales/views.py`)
3. `OfflineSyncRequestSerializer` validates the batch payload
4. Each sale processed independently via `_sync_one_sale()` — failures do not abort others
5. Idempotency: `Sale.objects.filter(tenant=tenant, client_sale_id=client_sale_id).first()` — already-synced sales return `{"status": "synced"}` without re-creating
6. Valid sales call the same `create_sale()` service with `client_sale_id=` and `synced_at=` populated
7. Response: per-sale result array with `{"status": "synced"|"failed", "server_sale_id", "receipt_number"}`

### Refund Flow

1. `POST /api/v1/sales/{id}/refund/` → `SaleRefundView.post()` (`backend/apps/sales/views.py`)
2. `process_refund(sale, items, notes, refunded_by)` (`backend/apps/sales/services.py`) — `@transaction.atomic`
3. `Sale.objects.select_for_update().get(pk=sale.pk)` — row-lock prevents concurrent refunds
4. Validates sale status is not already `cancelled` or `refunded`
5. Checks prior `StockMovement` records with `reference__startswith=f"{receipt}-R"` to sum already-returned quantities
6. Validates requested return quantity ≤ `original_qty - already_returned`
7. Calculates `refund_reference = f"{receipt_number}-R{n}"` (n = incrementing per sale)
8. For each return item: `add_stock(...)` → `StockMovement(type=RETURN)` → signal updates `StockLevel`
9. Sale status → `REFUNDED` (all items returned) or `PARTIAL_REFUND`
10. Refund note appended to `sale.notes` as `[REFUND] {refund_reference}: ...`

### Bootstrap (Offline Data Sync)

1. `GET /api/v1/offline/bootstrap/` → `BootstrapView.get()` (`backend/apps/offline/views.py`)
2. Resolves tenant from request user
3. Executes 6 focused queries (no N+1) to load all data the mobile app needs: business, shops, categories, products, customers, stock levels, expiry batches, active subscription
4. Cashier scoping: cashiers receive only their `default_shop` products and stock
5. Restaurants: `stock` and `expiry_batches` arrays are always empty
6. Response includes `server_time` for client clock sync

## Background Task Architecture

**Celery configuration** (`backend/config/settings/base.py`):
- Broker: Redis DB 1 (`CELERY_BROKER_URL`)
- Results: Redis DB 2 (`CELERY_RESULT_BACKEND`)
- `CELERY_TASK_ACKS_LATE = True` — tasks re-queued if worker dies mid-execution
- `CELERY_WORKER_PREFETCH_MULTIPLIER = 1` — prevents task hoarding

**Queues:**
- `notifications` — all push notification delivery tasks (`apps.notifications.tasks.*`)
- `default` — sales, inventory tasks (`apps.sales.tasks.*`, `apps.inventory.tasks.*`)

**Notification delivery flow** (`backend/apps/notifications/tasks.py`):
```
notify_user() → creates Notification + NotificationDelivery(status=pending)
             → deliver_push_notification.delay(delivery_id) queued to "notifications"
                → select_for_update(nowait=True) — skips if another worker has it
                → FirebaseService.send_to_user(user, title, body, data)
                → marks sent / failed / retries (back-off: 60s, 300s, 900s)
```

**Beat schedule** (DB-backed via `django_celery_beat.schedulers:DatabaseScheduler`):
| Task | Schedule | Purpose |
|------|----------|---------|
| `apps.accounts.tasks.cleanup_expired_otps` | Every hour | Purge expired OTP keys from Redis |
| `apps.subscriptions.tasks.check_subscription_expiry` | Daily | Deactivate expired subscriptions |
| `apps.notifications.tasks.requeue_stuck_deliveries` | Every 5 min | Requeue deliveries stuck in `processing` state |
| `apps.inventory.tasks.check_expiry_alerts` | Daily | Send expiry alerts for near-expired batches |

## Error Handling

**Strategy:** Custom exception hierarchy + global exception handler.

**Exception handler** (`backend/apps/core/exceptions.py` → `custom_exception_handler`):
All API errors return consistent shape:
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "...", "details": {...} } }
```

**Custom exception types:**
- `BusinessLogicError` — 422 Unprocessable Entity; base for domain violations
- `InsufficientStockError` — 422, code `INSUFFICIENT_STOCK`
- `SubscriptionLimitError` — 422, code `SUBSCRIPTION_LIMIT_EXCEEDED`
- `InvalidOTPError` — 400, code `INVALID_OTP`
- `OTPExpiredError` — 400, code `OTP_EXPIRED`
- `OTPCooldownError` — 429, carries `retry_after` seconds
- `OTPMaxAttemptsError` — 400 (subclass of `InvalidOTPError`)
- `OTPDeliveryFailedError` — 503
- `BankakAccountRequiredError` — 422, code `BANKAK_ACCOUNT_REQUIRED`
- `NotFound` — 404

## Cross-Cutting Concerns

**Tenant isolation:** Every queryset in views/services filters by `tenant=` (resolved via `get_tenant_from_request()`). Never query resources without a tenant filter.

**Audit logging:** `AuditLogMiddleware` (`backend/apps/audit_logs/middleware.py`) auto-records all authenticated `POST`/`PUT`/`PATCH`/`DELETE` requests. Stores user, action, model, object_id, masked changes (passwords/OTPs masked as `"***"`), IP, user-agent, duration_ms. Skips `/api/v1/health/`, static, media paths.

**Logging:** Named loggers under `apps.*` → `logging.getLogger(__name__)` in each module. Production: WARNING level root, INFO for `apps.*`. Dev: DEBUG for `apps.*`.

**Validation:** Input validated at serializer layer; business rule violations raise `BusinessLogicError` from services. Never raise HTTP exceptions from service functions.

**Restaurant vs shop logic:** Throughout services, `tenant.business_type == BusinessType.RESTAURANT` skips all inventory operations. Check this branch before any stock deduction/restoration.

## Architectural Constraints

- **Threading:** Standard Django WSGI (Gunicorn, 4 workers default). Celery workers are separate processes.
- **Global state:** None. Tenant context flows through `request.user.business` or `X-Tenant-ID` header — no thread-locals for tenant (contrast: audit log middleware does use thread-local for request access).
- **Circular imports:** Cross-app service calls use deferred `from apps.X import Y` inside function bodies to avoid import cycles (e.g. `accounts/services.py` → `accounts/otp/providers.py` deferred inside `request_login_otp`).
- **No ViewSets or Routers:** All URL patterns use explicit `path()` + `APIView` classes. Do not introduce ViewSets.
- **UUIDs as PKs:** All models use `UUIDField(primary_key=True, default=uuid.uuid4)`.

## Anti-Patterns

### Querying without tenant filter
**What happens:** A view resolves products/sales/inventory without filtering `tenant=`.
**Why it's wrong:** Returns data across all tenants — cross-tenant data leak.
**Do this instead:** Always call `get_tenant_from_request(request)` first, then filter: `Product.objects.filter(tenant=tenant, ...)`.

### Business logic in views
**What happens:** A view directly creates or modifies models (e.g. `Sale.objects.create(...)` inside a view method).
**Why it's wrong:** Bypasses transaction wrapping, stock deduction, receipt generation, and audit trail.
**Do this instead:** Call the corresponding service function (e.g. `create_sale(...)` from `backend/apps/sales/services.py`).

### Skipping select_for_update on concurrent writes
**What happens:** Concurrent refund or stock deduction without row-locking.
**Why it's wrong:** Race condition allows over-refunding or negative stock.
**Do this instead:** Use `Sale.objects.select_for_update().get(pk=sale.pk)` inside `transaction.atomic` as shown in `process_refund()`.

---

*Architecture analysis: 2026-05-19*
