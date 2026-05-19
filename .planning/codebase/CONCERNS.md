# Codebase Concerns

**Analysis Date:** 2026-05-19

---

## Tech Debt

**Dual OTP code paths (legacy vs. current):**
- Issue: Two parallel OTP implementations exist in `backend/apps/accounts/services.py`. The legacy path (`send_otp`, `verify_otp`, `login_with_otp`) stores OTPs as plaintext in Redis using `store_otp_in_redis` / `verify_otp_from_redis`. The current path (`request_login_otp`, `verify_login_otp`) uses HMAC-SHA256 hashes and per-channel keys. Both are live and wired to active endpoints.
- Files: `backend/apps/accounts/services.py` (lines 124–326), `backend/apps/accounts/utils.py`, `backend/apps/accounts/views.py` (`OTPVerifyView`, `ResendOTPView`), `backend/apps/accounts/public_urls.py`
- Impact: The legacy endpoints (`/auth/verify-otp/`, `/auth/resend-otp/`) store raw OTPs in Redis, bypassing the brute-force lockout (`OTP_MAX_ATTEMPTS`) and the attempt counter system that the current flow implements. A user can brute-force the legacy path indefinitely within the OTP TTL window.
- Fix approach: Remove `OTPVerifyView`, `ResendOTPView`, `send_otp`, `verify_otp`, and `login_with_otp`. Migrate any remaining callers to `request_login_otp` / `verify_login_otp`. Delete `store_otp_in_redis`, `get_otp_from_redis`, `delete_otp_from_redis`, `verify_otp_from_redis` from `core/utils.py`.

**Legacy `TWILIO_FROM_NUMBER` config still read:**
- Issue: `backend/apps/core/utils.py` line 257 references `settings.TWILIO_FROM_NUMBER` (marked `# legacy` in `base.py`). `_send_twilio_sms()` in `core/utils.py` is a second Twilio SMS path that is dead in production (the current provider route goes through `accounts/otp/providers.py`).
- Files: `backend/apps/core/utils.py` (lines 250–269), `backend/config/settings/base.py` (line 357)
- Impact: Misleading config surface; `_send_twilio_sms` is never called by the production login flow but remains importable, creating confusion about which code runs.
- Fix approach: Remove `_send_twilio_sms`, `send_sms_otp`, and `TWILIO_FROM_NUMBER`. Consolidate all OTP delivery into `backend/apps/accounts/otp/providers.py`.

**`Sale.item_count` is a lazy DB query on every serialization:**
- Issue: `Sale.item_count` (defined at `backend/apps/sales/models/sale.py` line 90–91) calls `self.items.count()` per instance. `SaleSerializer` exposes `item_count` as a field. The `SaleListCreateView.get` query does not annotate `item_count`, so serializing a page of 20 sales fires 20 additional `COUNT` queries.
- Files: `backend/apps/sales/models/sale.py` (line 90), `backend/apps/sales/serializers.py` (line 35), `backend/apps/sales/views.py` (lines 43–47)
- Impact: Every call to `GET /api/v1/sales/` fires N+1 COUNT queries (N = page size, default 20).
- Fix approach: Add `.annotate(item_count=Count("items"))` to the queryset in `SaleListCreateView.get`, and change `SaleSerializer.item_count` to `serializers.IntegerField(read_only=True)` without `source=` (Django will pick up the annotation automatically).

**`InboundTransaction.item_count` also triggers per-row queries:**
- Issue: `backend/apps/inventory/serializers.py` line 213 uses `source="items.count"` which calls `.count()` on the related manager per row, with no annotation in the list view queryset.
- Files: `backend/apps/inventory/serializers.py` (line 213), `backend/apps/inventory/views.py`
- Impact: N+1 COUNT queries on inbound transaction list.
- Fix approach: Same as above — annotate `item_count` in the queryset.

**`Business.active_subscription` property issues a query per serialization:**
- Issue: `backend/apps/tenants/models/business.py` line 70–71 defines `active_subscription` as a model property that queries `self.subscriptions.filter(...)`. It is accessed in admin serializers (`backend/apps/admin_panel/serializers.py` line 199, 286) via `SerializerMethodField`. List views annotate `has_active_subscription` but the detail serializer's `get_active_subscription` calls this property, issuing a per-row query unless the subscriptions are prefetched.
- Files: `backend/apps/tenants/models/business.py` (line 70), `backend/apps/admin_panel/serializers.py` (lines 199, 288)
- Impact: Extra DB queries on admin detail views.
- Fix approach: Use the already-prefetched `subscriptions` queryset inside the serializer method instead of calling the property.

**`Business.shop_count` property with partial cache pattern:**
- Issue: `backend/apps/tenants/models/business.py` lines 74–81 implement a `_shop_count` attribute cache, but only Django admin list views set it via annotation. Other callers hit the DB on every access.
- Files: `backend/apps/tenants/models/business.py` (line 74)
- Fix approach: Always annotate `shop_count` in querysets that serialize this field, rather than relying on an instance attribute cache.

**Duplicate slug conflict loop in `Business.save()`:**
- Issue: `backend/apps/tenants/models/business.py` lines 58–67 generate a unique slug in a `while` loop that issues one DB query per attempt. Under concurrent business creation this loop may fail to prevent duplicates due to the TOCTOU race.
- Files: `backend/apps/tenants/models/business.py` (line 58)
- Fix approach: Use a unique constraint with a retry-on-IntegrityError approach, or use a UUID suffix instead of a counter.

---

## Security Considerations

**Legacy OTP path has no brute-force protection:**
- Risk: `OTPVerifyView` and `ResendOTPView` (backed by `verify_otp_from_redis`) do not check `OTP_MAX_ATTEMPTS` or use the attempt counter keys. An attacker can enumerate a 6-digit OTP (1,000,000 possibilities) within the 300-second TTL using the unprotected endpoint.
- Files: `backend/apps/accounts/views.py` (line 94–118), `backend/apps/accounts/services.py` (line 261–288), `backend/apps/core/utils.py` (line 79–94)
- Current mitigation: `OTPRateThrottle` is applied (5/minute DRF throttle), but the DRF throttle uses in-memory or Redis key-per-IP counting that can be bypassed from multiple IPs.
- Recommendations: Remove the legacy path entirely (see Tech Debt above).

**TEST_PHONE / TEST_OTP bypass must not reach production:**
- Risk: `backend/apps/accounts/services.py` lines 133–141 skip OTP delivery and return a hardcoded OTP for `TEST_PHONE`. If `TEST_PHONE` is set in a production `.env`, any actor who knows the test phone number can authenticate as that user without a real OTP.
- Files: `backend/apps/accounts/services.py` (line 133), `backend/config/settings/base.py` (lines 347–348)
- Current mitigation: Comment in code says "Remove TEST_PHONE from .env.prod to disable permanently." There is no code-level assertion that `TEST_PHONE` is empty when `DEBUG=False`.
- Recommendations: Add a startup check: `if not settings.DEBUG and settings.TEST_PHONE: raise ImproperlyConfigured(...)`.

**Redis `IGNORE_EXCEPTIONS=True` silently breaks OTP security on Redis failure:**
- Risk: `backend/config/settings/base.py` line 173 sets `IGNORE_EXCEPTIONS: True` for the Redis cache. If Redis becomes unavailable, all `cache.set()` calls succeed silently (returning `None`). The OTP store silently fails, and `cache.get()` returns `None`. `verify_channel_otp` returns `False` for every attempt, locking users out. Worse, if an OTP was stored before Redis failed, `get_channel_otp_hash` returns `None`, causing `InvalidOTPError` — but the error message gives no indication Redis is down.
- Files: `backend/config/settings/base.py` (line 173), `backend/apps/core/utils.py` (lines 123–148)
- Current mitigation: None — Redis failure is fully swallowed.
- Recommendations: Add a health-check endpoint that verifies Redis connectivity, and consider setting `IGNORE_EXCEPTIONS=False` (or a custom exception handler) in production so Redis failures surface immediately via Sentry.

**`CSRF_TRUSTED_ORIGINS` default placeholder in production settings:**
- Risk: `backend/config/settings/production.py` line 27 defaults `CSRF_TRUSTED_ORIGINS` to `["https://your-domain.com"]`. If `CSRF_TRUSTED_ORIGINS` is not set in the production `.env`, CSRF protection will apply against the wrong origin.
- Files: `backend/config/settings/production.py` (line 27)
- Recommendations: Remove the placeholder default and make the variable required (`env.list("CSRF_TRUSTED_ORIGINS")` with no default).

**`SECURE_SSL_REDIRECT` defaults to False in production:**
- Risk: `backend/config/settings/production.py` line 32 sets `SECURE_SSL_REDIRECT=False` by default. If the nginx layer drops the `X-Forwarded-Proto` header (misconfiguration), HTTP traffic will be served without redirect.
- Files: `backend/config/settings/production.py` (line 32)
- Current mitigation: Comment says "handled by nginx." This is a deployment documentation concern.
- Recommendations: Add a deployment runbook check or CI assertion that verifies HTTPS is enforced.

**AuditLog middleware stores request body up to 4KB:**
- Risk: `backend/apps/audit_logs/middleware.py` lines 88–98 store request body for POST/PUT/PATCH calls. Fields named `password`, `otp`, and `token` are masked, but other sensitive fields (e.g., Bankak account numbers sent in POST bodies) are stored as-is in the `AuditLog.changes` JSON column.
- Files: `backend/apps/audit_logs/middleware.py` (line 88)
- Recommendations: Expand the mask list or apply an allowlist of fields to log rather than a blocklist of fields to mask.

**No password reset flow exists:**
- Risk: Users who have set a password (`has_password=True`) and forget it have no recovery path other than contacting support. There is no `/auth/forgot-password/` or OTP-to-reset-password endpoint.
- Files: `backend/apps/accounts/public_urls.py`, `backend/apps/accounts/services.py`
- Impact: Support burden; users may be permanently locked out of password-based login.

---

## Performance Risks

**`BootstrapView` returns all products, customers, and stock levels in a single response:**
- Problem: `backend/apps/offline/views.py` lines 76–97 fetch the entire product catalog, all customers, and all stock levels for a tenant with no pagination. A tenant with 5,000 products and 2,000 customers will return a very large JSON payload on every app launch.
- Files: `backend/apps/offline/views.py` (lines 54–136)
- Cause: The endpoint is intentionally designed for mobile offline bootstrap, but there is no delta sync mechanism. Every login re-downloads everything.
- Improvement path: Add `?since=<timestamp>` delta sync support, returning only records updated after that timestamp.

**`DashboardSummaryView` is large and runs 5 separate DB queries with no connection sharing:**
- Problem: `backend/apps/sales/views.py` lines 408–662 run 5 independent aggregation queries. The `# noqa: C901` comment signals complexity is acknowledged. Cache TTL is 60 seconds, but cache is keyed per user role, which means a shop with 10 cashiers generates 10 distinct cache entries.
- Files: `backend/apps/sales/views.py` (line 408)
- Improvement path: Cache at the shop+date level, then compose per-cashier shift data without duplicating the shared aggregates.

**StockMovement `reference` index used for refund lookups:**
- Problem: `backend/apps/sales/services.py` lines 245–253 query `StockMovement` filtered by `reference__startswith=f"{sale.receipt_number}-R"`. The `reference` column has a simple index (`backend/apps/inventory/models/movement.py` line 52), but `startswith` on a text field is a prefix scan — efficient only with a B-tree index and a fixed prefix. The index exists but the query also filters `shop` and `movement_type`, which are separate indexes. There is no composite index covering `(shop, movement_type, reference)`.
- Files: `backend/apps/inventory/models/movement.py`, `backend/apps/sales/services.py` (line 245)
- Improvement path: Add `models.Index(fields=["shop", "movement_type", "reference"])` to `StockMovement.Meta`.

**Subscription limit guards issue a separate DB query on every create endpoint:**
- Problem: `check_shop_limit`, `check_product_limit`, `check_user_limit` in `backend/apps/subscriptions/guards.py` each call `require_active_subscription()`, which queries `business.subscriptions` separately. These functions are called in `tenants/views.py` and `products/views.py` on every POST request, issuing a subscription query that is not part of the main request queryset.
- Files: `backend/apps/subscriptions/guards.py`, `backend/apps/tenants/views.py` (line 134), `backend/apps/products/views.py` (line 244), `backend/apps/accounts/views.py` (line 358)
- Improvement path: Cache the active subscription on the request object or use `select_related` in `get_tenant_from_request`.

---

## Missing Features / Incomplete Implementations

**No password reset (forgot password) flow:**
- The `SetPasswordView` (`/auth/set-password/`) requires an authenticated session. There is no unauthenticated OTP-to-new-password reset flow for users who are locked out.
- Files: `backend/apps/accounts/public_urls.py`, `backend/apps/accounts/views.py`

**`CARD`, `BANK_TRANSFER`, `MOBILE_WALLET`, `LOYALTY_POINTS`, `SPLIT`, `CREDIT` payment methods have no processing logic:**
- `PaymentMethod` enum in `backend/apps/sales/models/sale.py` defines 8 values, but only `CASH` and `BANKAK` have any business logic (Bankak requires an account snapshot). The remaining 6 methods are accepted by the API and stored but have no validation, processing, or reporting implementation.
- Files: `backend/apps/sales/models/sale.py` (line 9–17), `backend/apps/sales/services.py` (line 69–74)
- Risk: Sales created with these methods will succeed but may produce incorrect financial reporting.

**Refund tracking via `sale.notes` text field is fragile:**
- `process_refund` in `backend/apps/sales/services.py` line 272 determines the refund sequence number by counting `"[REFUND]"` occurrences in `sale.notes`. If notes are edited manually (via admin or a future API), the refund counter will be wrong, generating a duplicate `refund_reference`.
- Files: `backend/apps/sales/services.py` (lines 272–274)
- Fix approach: Add a `SaleRefund` model to store refund events as structured records rather than embedding them in a text field.

**Offline asset manifest has no content hash:**
- `AssetManifestView` in `backend/apps/offline/views.py` line 199 documents `# Phase-1: no content hash — updated_at is used as the version signal.` Images that are re-uploaded at the same timestamp will not trigger a mobile re-download.
- Files: `backend/apps/offline/views.py` (line 199)

**`IsVerified` permission class exists but is not applied to any endpoint:**
- `backend/apps/core/permissions.py` defines `IsVerified` which checks `user.is_verified`. No view uses it. Unverified users can call all business endpoints after receiving a JWT.
- Files: `backend/apps/core/permissions.py` (line 90), `backend/apps/accounts/public_urls.py`
- Risk: A user account created by staff (`is_verified=False`) can immediately access the full API without ever completing phone verification.

---

## Operational Risks

**No structured log shipping in production:**
- Production logging (`backend/config/settings/production.py`) writes only to stdout (`console` handler). There is no file handler, log aggregation service, or centralized log drain configured. All logs are lost if the container restarts unless the orchestrator captures stdout.
- Files: `backend/config/settings/production.py` (lines 75–116)
- Recommendations: Configure a log drain (e.g., Papertrail, Datadog, or Loki) or add a file handler with rotation.

**Sentry is optional (`sentry_sdk` inside a `try/except ImportError`):**
- `backend/config/settings/production.py` lines 5–12 wrap the Sentry import in a try/except. If `sentry-sdk` is not installed, production runs silently without error tracking and the startup gives no warning.
- Files: `backend/config/settings/production.py` (lines 5–12)
- Recommendations: Move `sentry-sdk` to required dependencies and remove the try/except, or add a startup warning log if Sentry is unavailable.

**Celery task queue has no dead-letter handling:**
- `backend/config/settings/base.py` configures Celery with `CELERY_TASK_ACKS_LATE=True` and `CELERY_TASK_TIME_LIMIT=30*60`, but there is no dead-letter queue or alerting for tasks that exhaust retries. The `deliver_push_notification` task (`backend/apps/notifications/tasks.py`) uses `max_retries=0` with manual retry logic — tasks that exceed `_RETRY_DELAYS` (3 attempts) are silently abandoned.
- Files: `backend/config/settings/base.py` (line 192), `backend/apps/notifications/tasks.py` (line 30)

**No database backup strategy documented or automated:**
- No backup scripts, cron jobs, or references to pg_dump / PITR are present in the repository. The `.env.prod.example` file exists but contains no backup-related variables.
- Files: `/.env.prod.example`

**Subscription expiry task double-counts reminder sends:**
- `backend/apps/subscriptions/tasks.py` line 54 calls `expiring_soon.count()` after iterating and sending reminders. This issues a second COUNT query and the count in the log message reflects all subscriptions due in 7 days, not just the ones that successfully received an SMS. This is a misleading log line, not a functional bug.
- Files: `backend/apps/subscriptions/tasks.py` (line 54)

---

## Known Bugs / Fragile Code Paths

**`process_refund` refund number counter races on concurrent requests:**
- Even with `select_for_update()` on the `Sale` row, the refund sequence number (`refund_n`) is derived by counting `"[REFUND]"` substrings in `sale.notes` (line 272). Two concurrent refund requests will both read zero `[REFUND]` occurrences before either commits, producing two refunds with the same `refund_reference` (`REC-XXXXXXXX-R1`). The row lock on the `Sale` prevents this under normal single-threaded requests, but the lock is on the Sale row, not a sequence counter — the notes field itself is the counter.
- Files: `backend/apps/sales/services.py` (lines 272–274)
- Assessment: The `select_for_update()` on the sale row actually does prevent the race for the Sale row update, but it is non-obvious. The concern is that `select_for_update()` was added after the fact and the notes-based counter is brittle if the locking is ever changed.
- Fix approach: Replace with a dedicated `SaleRefund` model with an auto-incrementing sequence per sale.

**`HasBusiness` permission silently mutates user object on every request:**
- `backend/apps/core/permissions.py` lines 61–67 call `request.user.save()` inside `has_permission` to heal a stale `business_id` FK. This means a permission check has a write side-effect that fires on every request for affected owners.
- Files: `backend/apps/core/permissions.py` (line 61)
- Fix approach: Move the FK healing to a one-time migration or a signal on Business creation.

**`SaleCancelView` fetches the sale without `select_for_update`:**
- `backend/apps/sales/views.py` line 171 fetches the sale with `Sale.objects.get(pk=pk, tenant=tenant)` then calls `cancel_sale()`. The `cancel_sale` service wraps its own atomic block but does not re-acquire a row lock on the sale, so a concurrent cancel request could both read the same `COMPLETED` status and proceed.
- Files: `backend/apps/sales/views.py` (line 171), `backend/apps/sales/services.py` (line 174)
- Fix approach: Add `select_for_update()` inside `cancel_sale` mirroring the pattern in `process_refund`.

**`format_phone` default country is UAE (`AE`) even though the business is Sudan-focused:**
- `backend/apps/core/utils.py` line 190 defaults the country to `"AE"` (UAE, +971). The Business model's default currency is `"SDG"` and timezone is `"Africa/Khartoum"`, indicating Sudan. Sudanese phone numbers starting without a country code will be incorrectly parsed as UAE numbers.
- Files: `backend/apps/core/utils.py` (line 190)
- Fix approach: Change the default to `"SD"` (+249) or make it a required argument.

---

## Test Coverage Gaps

**No tests for `customers`, `products`, `tenants`, `subscriptions`, `admin_panel`:**
- The following apps have zero test files:
  - `backend/apps/customers/`
  - `backend/apps/products/`
  - `backend/apps/tenants/`
  - `backend/apps/subscriptions/`
  - `backend/apps/admin_panel/`
- Any regression in customer management, product CRUD, tenant creation, subscription limit enforcement, or admin operations will not be caught by the test suite.
- Priority: High for `subscriptions/guards.py` (subscription limit enforcement), `tenants/services.py` (business creation), and `admin_panel/views.py` (admin operations on owners/businesses).

**`cancel_sale` has no tests:**
- Only `process_refund` and sale creation are covered in `backend/apps/sales/tests/test_sales_v2.py`. The cancellation flow (status update, stock restoration) is untested.
- Files: `backend/apps/sales/tests/test_sales_v2.py`

**No tests for the `offline` app:**
- `BootstrapView` and `AssetManifestView` in `backend/apps/offline/views.py` have no tests. The bootstrap endpoint is the most critical path for mobile app startup.
- Files: `backend/apps/offline/views.py`

**No tests for `DashboardSummaryView`:**
- `backend/apps/sales/tests/test_dashboard_summary.py` exists. Verify it actually covers the cashier shift scoping and timezone-aware day boundary logic; these are the most complex branches.
- Files: `backend/apps/sales/tests/test_dashboard_summary.py`, `backend/apps/sales/views.py` (line 408)

**Inventory tasks (`check_expiry_alerts`) have no tests:**
- `backend/apps/inventory/tasks.py` is referenced in `CELERY_BEAT_SCHEDULE` but no test covers the expiry alert logic.
- Files: `backend/apps/inventory/tasks.py`

---

## Hardcoded Values That Should Be Config

**`_award_loyalty_points` hardcodes the points-per-currency ratio:**
- `backend/apps/sales/services.py` line 209: `points_earned = int(amount / 10)` — the ratio of 1 point per 10 currency units is hardcoded. This cannot be changed per tenant or per plan without a code deploy.
- Files: `backend/apps/sales/services.py` (line 209)
- Fix approach: Add a `loyalty_points_per_unit` field to `Business` or `Plan`.

**Default currency `"SDG"` and timezone `"Africa/Khartoum"` are hardcoded on `Business` model:**
- `backend/apps/tenants/models/business.py` lines 40–41. These are sensible defaults for the current market but will break if the product expands.
- Files: `backend/apps/tenants/models/business.py` (line 40)
- Fix approach: Move defaults to settings (`DEFAULT_BUSINESS_CURRENCY`, `DEFAULT_BUSINESS_TIMEZONE`).

**`OTP_SMS_MESSAGE` is hardcoded in Arabic in `core/utils.py`:**
- `backend/apps/core/utils.py` line 237: the SMS message body is a hardcoded Arabic string. If the product needs English or multi-language support, this requires a code change.
- Files: `backend/apps/core/utils.py` (line 237)
- Fix approach: Move to a `notification_templates.py` entry or a settings variable.

---

*Concerns audit: 2026-05-19*
