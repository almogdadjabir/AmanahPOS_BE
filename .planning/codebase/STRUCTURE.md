<!-- refreshed: 2026-05-19 -->
# Codebase Structure

**Analysis Date:** 2026-05-19

## Directory Layout

```
AmanaPOS/
├── backend/                  # Django API server
│   ├── apps/                 # All Django applications
│   │   ├── accounts/         # Auth, users, OTP, Bankak
│   │   ├── activity_logs/    # Queryable API activity log
│   │   ├── admin_panel/      # Super-admin management endpoints
│   │   ├── audit_logs/       # Middleware-driven mutation audit trail
│   │   ├── core/             # Shared utilities, exceptions, permissions
│   │   ├── customers/        # Customer records, loyalty points
│   │   ├── inventory/        # Stock levels, movements, batches, vendors
│   │   ├── notifications/    # Push (FCM) + in-app notifications
│   │   ├── offline/          # Bootstrap payload + asset manifest
│   │   ├── products/         # Product catalog, categories
│   │   ├── sales/            # Sales, offline sync, refunds, dashboard
│   │   ├── subscriptions/    # Plans, subscriptions, resource limits
│   │   └── tenants/          # Business + Shop multi-tenancy
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py       # All shared settings
│   │   │   ├── local.py      # Local dev overrides
│   │   │   ├── production.py # Production security + Sentry + whitenoise
│   │   │   └── test.py       # SQLite + in-memory cache for test runs
│   │   ├── urls.py           # Root URL config
│   │   ├── celery.py         # Celery app init
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── local.txt
│   │   └── production.txt
│   ├── templates/            # Django HTML templates (email, etc.)
│   ├── media/                # Local media root (dev only)
│   ├── staticfiles/          # Collected static files
│   └── manage.py
├── admin/                    # Next.js super-admin dashboard
│   └── src/
│       ├── app/
│       │   ├── [locale]/
│       │   │   ├── (dashboard)/  # Dashboard route group
│       │   │   │   ├── businesses/
│       │   │   │   ├── customers/
│       │   │   │   ├── inventory/
│       │   │   │   ├── owners/
│       │   │   │   ├── plans/
│       │   │   │   ├── products/
│       │   │   │   ├── sales/
│       │   │   │   ├── subscriptions/
│       │   │   │   ├── subscription/
│       │   │   │   ├── users/
│       │   │   │   ├── notifications/
│       │   │   │   ├── activity-logs/
│       │   │   │   └── system/
│       │   │   └── login/
│       │   └── api/
│       │       └── auth/         # Token refresh proxy routes
│       ├── actions/              # Next.js server actions
│       ├── components/           # Shared UI components
│       ├── i18n/                 # Internationalization config
│       ├── lib/                  # Shared utilities
│       ├── messages/             # i18n message files
│       ├── middleware.ts          # Next.js middleware (auth guard)
│       ├── services/             # API call services
│       ├── styles/
│       └── types/
├── landing_page/             # Marketing landing page (separate Next.js app)
├── docker/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   └── nginx/
├── docker-compose.yml        # Dev compose (Django + Celery + Redis + PostgreSQL + MinIO)
├── docker-compose.prod.yml   # Production compose
├── Dockerfile                # Root Dockerfile
├── Makefile                  # Dev task shortcuts
├── DEPLOY.md
├── QUICKSTART.md
└── AmanaPOS.postman_collection.json  # Full API collection
```

## Backend App Breakdown

### `apps/accounts/`
- **Owns:** `CustomUser`, `BankakAccount`, OTP logic
- **Key files:**
  - `models/user.py` — `CustomUser(AbstractBaseUser)`, roles: `owner/manager/cashier`, phone is `USERNAME_FIELD`
  - `models/bankak.py` — `BankakAccount` linked to owner user
  - `services.py` — `register_user`, `request_login_otp`, `verify_login_otp`, `login_with_password`, `send_otp`, `get_tokens_for_user`
  - `otp/providers.py` — `StubOtpSender`, `TwilioMessagingOtpSender`; selected via `OTP_PROVIDER` env
  - `public_urls.py` — unauthenticated auth endpoints (login, OTP verify, token refresh)
  - `urls.py` — authenticated endpoints (register, profile, set-password, bankak, logout)
  - `user_urls.py` — staff management endpoints (owner-only)

### `apps/tenants/`
- **Owns:** `Business`, `Shop`
- **Key files:**
  - `models/business.py` — `Business` is the tenant root; has `owner` FK, `subscription_plan` FK, `business_type` (shop/restaurant), auto-slug
  - `models/shop.py` — `Shop` belongs to `Business`; has `is_main` flag

### `apps/products/`
- **Owns:** `Category`, `Product`
- **Key files:**
  - `models/product.py` — `Product` has `tenant` FK, `shop` FK (optional, for shop-scoped products), `track_inventory`, `min_stock_level`, `thumbnail`/`image` fields
  - `models/category.py` — `Category` has `tenant` FK, `sort_order`
  - `services.py` — `get_tenant_from_request()` (used by nearly every app), `create_product()`

### `apps/inventory/`
- **Owns:** `StockLevel`, `StockMovement`, `ProductBatch`, `InboundReceive`, `Vendor`
- **Key files:**
  - `models/movement.py` — `StockMovement`; `MovementType` choices: `in/out/adjustment/sale/return/transfer_in/transfer_out/opening`; negative quantity stored for out-type movements
  - `models/stock_level.py` — `StockLevel` per product+shop; updated via `post_save` signal on `StockMovement`
  - `models/batch.py` — `ProductBatch` tracks expiry dates
  - `services.py` — `add_stock()`, `deduct_stock()` — called from `apps.sales.services`
  - `signals.py` — `update_stock_level` receiver: `select_for_update()` inside `transaction.atomic`; schedules low-stock notification via Celery

### `apps/sales/`
- **Owns:** `Sale`, `SaleItem`
- **Key files:**
  - `models/sale.py` — `Sale` has `tenant`+`shop`+`cashier`+`customer` FKs; `SaleStatus` choices; `client_sale_id` for offline idempotency; covering indexes for dashboard queries
  - `models/sale_item.py` — `SaleItem` has `sale` + `product` FKs; decimal quantity
  - `services.py` — `create_sale()`, `cancel_sale()`, `process_refund()` — all `@transaction.atomic`
  - `views.py` — `SaleListCreateView`, `SaleDetailView`, `SaleCancelView`, `OfflineSyncView`, `SalesSummaryView`, `DashboardSummaryView`, `SaleRefundView`

### `apps/customers/`
- **Owns:** `Customer`
- Tracks `loyalty_points`; linked to `tenant`

### `apps/subscriptions/`
- **Owns:** `Plan`, `Subscription`
- **Key files:**
  - `models/plan.py` — `Plan` has `max_shops`, `max_products`, `max_users`, `features` (JSON); `0` = unlimited
  - `guards.py` — `check_shop_limit()`, `check_user_limit()`, `check_product_limit()`, `require_feature()` — raise `SubscriptionLimitError` (422)

### `apps/notifications/`
- **Owns:** `Notification`, `NotificationDelivery`, `DeviceToken`, `NotificationTemplate`, `NotificationSetting`
- **Key files:**
  - `services/` — push delivery, Firebase service
  - `tasks.py` — `deliver_push_notification` (queue: `notifications`), `requeue_stuck_deliveries`, `send_low_stock_notification`
  - `notification_templates.py` — `render_notification(template_name, **kwargs)` returns `{title, body, data}`

### `apps/offline/`
- **Key files:**
  - `views.py` — `BootstrapView` (full tenant data snapshot), `AssetManifestView` (image URLs + `updated_at`)

### `apps/admin_panel/`
- Super-admin only (`IsAdminUser`); manages owners, businesses, plans, subscriptions at platform level
- Has separate `admin_urls.py` for notification broadcast endpoints

### `apps/audit_logs/`
- `middleware.py` — `AuditLogMiddleware` stores `AuditLog` records for `POST/PUT/PATCH/DELETE` by authenticated users

### `apps/activity_logs/`
- Queryable activity log surfaced through admin panel

### `apps/core/`
- **Key files:**
  - `exceptions.py` — all custom exception classes + `custom_exception_handler`
  - `permissions.py` — `IsOwner`, `IsManagerOrAbove`, `IsCashierOrAbove`, `HasBusiness`, `IsTenantMember`, `IsVerified`
  - `pagination.py` — `StandardPagination` (page size 20)
  - `utils.py` — `generate_receipt_number()`, OTP Redis helpers (`store_channel_otp`, `verify_channel_otp`, etc.)
  - `storage.py` — `PrivateMediaStorage` for MinIO/S3
  - `image_service.py` — `build_image_url()` generates presigned or public URLs
  - `middleware.py` — `JsonErrorMiddleware` (ensures errors are always JSON)

## URL Routing Structure

```
/admin/                          → Django admin (production: env ADMIN_URL)
/api/v1/health/                  → apps.core (no auth, no rate limit)
/api-public/v1/auth/             → apps.accounts.public_urls (no JWT required)
  login/otp/                     → POST request OTP
  login/otp/verify/              → POST verify OTP → JWT pair
  login/password/                → POST phone+password → JWT pair
  verify-otp/                    → POST verify phone OTP
  resend-otp/                    → POST resend OTP
  token/refresh/                 → POST refresh JWT

/api/v1/                         → JWT required for all below
  auth/                          → apps.accounts (profile, register, logout, bankak)
  users/                         → apps.accounts.user_urls (staff CRUD, owner-only)
  tenants/businesses/            → apps.tenants
  tenants/businesses/{id}/shops/ → apps.tenants
  products/                      → apps.products
  products/categories/           → apps.products
  inventory/                     → apps.inventory (stock, movements, batches, vendors)
  sales/                         → apps.sales
  sales/offline-sync/            → POST batch offline sync
  sales/dashboard-summary/       → GET cashier/owner dashboard
  sales/{id}/refund/             → POST process refund
  customers/                     → apps.customers
  subscriptions/                 → apps.subscriptions
  subscriptions/plans/           → GET available plans
  offline/bootstrap/             → GET full tenant data snapshot
  offline/assets/manifest/       → GET image asset manifest
  notifications/                 → apps.notifications (list, mark-read, devices)
  admin/                         → apps.admin_panel (super-admin only)
  admin/activity-logs/           → apps.activity_logs

/api/schema/                     → OpenAPI schema (drf-spectacular)
/api/docs/                       → Swagger UI
/api/redoc/                      → ReDoc
```

## Settings Hierarchy

All settings inherit from `backend/config/settings/base.py`:

| File | Purpose | Key overrides |
|------|---------|---------------|
| `base.py` | All shared config | Database, Redis, Celery, JWT, DRF, OTP, MinIO, Logging |
| `local.py` | Dev environment | `DEBUG=True`, debug toolbar, relaxed CORS |
| `production.py` | Production | `DEBUG=False`, HSTS, whitenoise, Sentry, restricted logging |
| `test.py` | Test runs | SQLite, `LocMemCache`, `USE_S3=False`, OTP stub, `FIREBASE_ENABLED=False` |

Selected via `DJANGO_SETTINGS_MODULE` env var:
- Dev: `config.settings.local`
- Prod: `config.settings.production`
- Test: `config.settings.test`

## Naming Conventions

**Files:**
- App module files: `snake_case.py` (e.g. `sale_item.py`, `stock_level.py`)
- Models split by model: one file per model in `models/` subdirectory
- Each app has: `models/`, `migrations/`, `services.py`, `views.py`, `serializers.py`, `urls.py`, `tests/`
- Test directories: `tests/` subdirectory with `test_*.py` files

**Models:**
- All PKs: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- All tables: explicit `db_table` in `Meta` (e.g. `"sales_sales"`, `"accounts_users"`)
- Timestamps: `created_at = DateTimeField(auto_now_add=True)`, `updated_at = DateTimeField(auto_now=True)`
- Soft delete: `is_active = BooleanField(default=True)` (no hard deletes on most models)
- Tenant link: always named `tenant` (FK to `tenants.Business`)

**Views:**
- Naming pattern: `{Model}{Action}View` (e.g. `SaleListCreateView`, `SaleDetailView`, `SaleRefundView`)
- All views are `APIView` subclasses — no ViewSets

**Services:**
- All service functions are module-level functions (not class methods)
- Mutating functions use `@transaction.atomic` decorator or explicit `with transaction.atomic()`

## Where to Add New Code

**New API endpoint:**
1. Add model to `backend/apps/{app}/models/{model}.py` + register in `models/__init__.py`
2. Add business logic to `backend/apps/{app}/services.py`
3. Add serializers to `backend/apps/{app}/serializers.py`
4. Add view class to `backend/apps/{app}/views.py`
5. Add URL pattern to `backend/apps/{app}/urls.py`
6. If unauthenticated, add to `public_urls.py` (for `accounts`) or note that only `accounts` has a public URL file
7. Add migration: `python manage.py makemigrations {app}`

**New background task:**
1. Add to `backend/apps/{app}/tasks.py`
2. Add route in `CELERY_TASK_ROUTES` in `backend/config/settings/base.py` if using `notifications` queue
3. For recurring tasks, add entry to `CELERY_BEAT_SCHEDULE` in `backend/config/settings/base.py`

**New permission:**
- Add to `backend/apps/core/permissions.py`

**New custom exception:**
- Add to `backend/apps/core/exceptions.py`, inherit from `BusinessLogicError` or `APIException`

**New OTP provider:**
- Implement `BaseOtpSender` in `backend/apps/accounts/otp/providers.py`, register in `get_otp_sender()`

**New product/tenant-scoped queryset:**
- Always include `tenant=get_tenant_from_request(request)` filter
- Add appropriate composite index in model `Meta.indexes`

**Tests:**
- Place in `backend/apps/{app}/tests/test_{feature}.py`
- Use `config.settings.test` (SQLite, no Redis, OTP stub)

## Special Directories

**`backend/media/`:**
- Purpose: Local dev media root (product images, logos)
- Generated: No
- Committed: No (`.gitignore`)
- Production: MinIO/S3 via `PrivateMediaStorage` (`backend/apps/core/storage.py`)

**`backend/staticfiles/`:**
- Purpose: `collectstatic` output
- Generated: Yes
- Committed: No

**`admin/.next/`:**
- Purpose: Next.js build cache and server output
- Generated: Yes
- Committed: No

**`backend/apps/{app}/migrations/`:**
- Purpose: Django database migrations
- Generated: Yes (via `makemigrations`)
- Committed: Yes

---

*Structure analysis: 2026-05-19*
