# Testing Patterns

**Analysis Date:** 2026-05-19

## Test Framework

**Runner:**
- pytest 8.3.2 with pytest-django 4.8.0
- Config: no `pytest.ini` or `pyproject.toml` — pytest is invoked bare via `make test`
- Django settings module for tests must be passed as env var or CLI flag: `DJANGO_SETTINGS_MODULE=config.settings.test`

**Supporting libraries (all in `backend/requirements/local.txt`):**
- `pytest-cov==5.0.0` — coverage reporting
- `pytest-mock==3.14.0` — `mocker` fixture
- `pytest-asyncio==0.23.8` — async test support
- `factory-boy==3.3.1` — model factories (installed but not yet used in existing tests)
- `faker==27.0.0` — fake data generation (installed, not yet used)
- `model-bakery==1.19.5` — quick model creation (installed, not yet used)

**Run Commands:**
```bash
# Via Docker (primary method)
make test                            # run all tests
make test-cov                        # run with HTML + terminal coverage report

# Equivalent raw commands inside container
pytest                               # all tests
pytest --cov=apps --cov-report=html --cov-report=term-missing

# Locally without Docker (requires local Python env)
cd backend
DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest
```

## Test Settings

**Location:** `backend/config/settings/test.py`

Key overrides from base settings:
```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test_db.sqlite3",
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

USE_S3 = False          # filesystem storage, not S3/MinIO
FIREBASE_ENABLED = False # no push notifications
OTP_PROVIDER = "stub"   # no real SMS/WhatsApp sent
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
DEV_OTP_CODE = ""       # real OTP generation — no override in tests
```

Tests run entirely without Docker dependencies. No Redis, no PostgreSQL, no S3, no Twilio/Firebase required.

## Test File Organization

**Location:** Co-located `tests/` package inside each app.

```
backend/apps/
├── accounts/tests/
│   ├── __init__.py
│   ├── test_login_otp_v2.py      # OTP login flow, channel selection, hashing, JWT
│   └── test_profile_features.py  # enabled_features in profile response
├── inventory/tests/
│   ├── __init__.py
│   ├── test_expiry.py             # ProductBatch model methods (is_expired, is_expiring_soon)
│   ├── test_inbound.py            # POST /api/v1/inventory/inbound/ (feature-gated, permissions)
│   ├── test_premium_endpoints.py  # Premium-gated: /inventory/premium-summary/, expiry reports
│   └── test_vendor.py             # Vendor CRUD, tenant scoping, inbound vendor integration
├── notifications/tests/
│   ├── __init__.py
│   ├── test_budgetsms.py          # BudgetSmsProvider unit tests (phone normalisation, send)
│   └── test_push_notifications.py # Push notification service tests
└── sales/tests/
    ├── __init__.py
    ├── test_sales_v2.py           # Receipts, search, offline sync, refund service + view
    └── test_dashboard_summary.py  # Dashboard summary endpoint aggregations, caching, scoping
```

**Apps with no tests at all:**
- `apps/customers/` — no test directory
- `apps/products/` — no test directory
- `apps/tenants/` — no test directory
- `apps/subscriptions/` — no test directory
- `apps/admin_panel/` — no test directory
- `apps/offline/` — no test directory
- `apps/activity_logs/` — no test directory

## Test Patterns

### Test Case Class Structure

All tests use Django's `TestCase` from `django.test`. No bare `pytest` functions — the entire test suite uses the class-based `TestCase` pattern.

```python
from django.test import TestCase
from rest_framework.test import APIClient

class TestSaleCreateReceiptNumber(TestCase):
    def setUp(self):
        self.owner = make_owner()
        self.business = make_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business)
        seed_stock(self.product, self.shop, 10)
        self.client = make_auth_client(self.owner)

    def test_receipt_number_in_create_response(self):
        resp = create_sale_via_api(self.client, self.shop, self.product)
        self.assertEqual(resp.status_code, 201)
        self.assertIn("receipt_number", resp.data["data"])
```

### Authentication in Tests

**Two patterns are used:**

**Pattern 1 — `force_authenticate` (preferred for most tests):**
```python
def make_auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client
```
Used in `apps/sales/tests/`, `apps/accounts/tests/`.

**Pattern 2 — Real JWT token (used when testing token-specific behavior):**
```python
from rest_framework_simplejwt.tokens import RefreshToken

def auth_client(user):
    c = APIClient()
    token = str(RefreshToken.for_user(user).access_token)
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return c
```
Used in `apps/inventory/tests/test_vendor.py` and `test_premium_endpoints.py`.

Use `force_authenticate` unless the test specifically involves token validation or JWT behaviour.

### Helper Function Pattern

Each test module defines module-level helper functions to create fixtures. These are plain functions, not Django fixtures or factory-boy factories.

```python
def make_owner(phone="+249900000001"):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Owner", role="owner", is_active=True,
    )

def make_business(owner):
    return Business.objects.create(
        owner=owner, name="Test Biz", slug=f"test-biz-{uuid.uuid4().hex[:6]}",
        business_type="shop",
    )

def make_shop(business):
    return Shop.objects.create(business=business, name="Main Shop", is_main=True, is_active=True)

def seed_stock(product, shop, qty=10):
    StockLevel.objects.create(product=product, shop=shop, quantity=qty)
```

**Phone number uniqueness:** Each test module uses distinct phone number prefixes to avoid collisions across `TestCase` classes. Example: `test_sales_v2.py` uses `+249900000001`–`+249900000005`.

### Settings Override Pattern

Use `@override_settings(...)` for test-specific configuration at the class level:

```python
OTP_TEST_SETTINGS = {
    "OTP_PROVIDER": "stub",
    "DEFAULT_OTP_CHANNEL": "sms",
    "OTP_MAX_ATTEMPTS": 5,
    ...
}

@override_settings(**OTP_TEST_SETTINGS)
class TestRequestOtpChannels(TestCase):
    def setUp(self):
        cache.clear()  # always clear cache in OTP tests
```

Also used for cache isolation in dashboard tests:
```python
@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "test-dashboard-cache"}})
class DashboardSummaryTest(TestCase):
```

### Testing Business Logic Errors

```python
def test_cannot_refund_cancelled_sale(self):
    from apps.core.exceptions import BusinessLogicError
    self.sale.status = SaleStatus.CANCELLED
    self.sale.save()
    with self.assertRaises(BusinessLogicError):
        process_refund(sale=self.sale, items=[...], ...)

# For checking the specific error code:
with self.assertRaises(BusinessLogicError) as ctx:
    process_refund(...)
self.assertEqual(ctx.exception.detail.code, "QUANTITY_EXCEEDED")
```

### Testing API Error Responses

When testing HTTP error codes from views, allow for the valid range rather than a single exact code:
```python
self.assertIn(resp.status_code, [400, 422])   # BusinessLogicError can be either
self.assertFalse(resp.data["success"])
```

### Mocking External Services

Use `unittest.mock.patch` and `MagicMock` for external HTTP calls:

```python
from unittest.mock import MagicMock, patch

@patch("urllib.request.urlopen")
def test_success_returns_result(self, mock_urlopen):
    mock_urlopen.return_value = _make_response("OK 1 message delivered")
    result = self.provider.send(...)
    self.assertTrue(result.success)
```

OTP delivery is automatically stubbed in all tests via `OTP_PROVIDER = "stub"` in `config/settings/test.py` — no manual patching needed for OTP flows.

### Service-Level vs. View-Level Tests

Both levels are tested:

**Service tests** (call the service function directly):
```python
from apps.sales.services import process_refund

result = process_refund(sale=self.sale, items=[...], refunded_by=self.owner)
self.assertEqual(result["refund_reference"], ...)
```

**View/API tests** (call via `APIClient`):
```python
resp = self.client.post(f"/api/v1/sales/{self.sale_id}/refund/", {...}, format="json")
self.assertEqual(resp.status_code, 200)
self.assertIn("refund_reference", resp.data)
```

The `test_sales_v2.py` file covers both: `TestProcessRefund` tests the service directly, `TestRefundView` tests the HTTP endpoint.

## Migrations Flag

No `--no-migrations` flag is used. Tests run against a fresh SQLite database with full migrations applied. This is the default pytest-django behavior when `DATABASES` points to SQLite.

The test database file is `backend/test_db.sqlite3` (created by Django's test runner, deleted after the run — not committed).

## Coverage

**Requirements:** No enforced minimum coverage threshold.

**View coverage report:**
```bash
make test-cov
# Generates htmlcov/ directory + terminal summary
# Coverage scope: apps/ only (--cov=apps)
```

## Coverage Gaps

**Entire apps with zero tests:**

- `apps/customers/` — Customer CRUD, loyalty points, search (`apps/customers/views.py`, `apps/customers/services.py` if any)
- `apps/products/` — Product and Category CRUD, image handling (`apps/products/views.py`, `apps/products/services.py`)
- `apps/tenants/` — Business onboarding, shop management (`apps/tenants/views.py`, `apps/tenants/services.py`)
- `apps/subscriptions/` — Plan limits enforcement, subscription expiry (`apps/subscriptions/views.py`)
- `apps/admin_panel/` — Internal admin endpoints (`apps/admin_panel/views.py`)
- `apps/offline/` — Offline queue management (`apps/offline/views.py`)
- `apps/activity_logs/` — Audit trail (`apps/activity_logs/views.py`)

**Untested code paths in covered apps:**

- `DashboardSummaryView` cache invalidation path (cache hit path is tested, but cache set TTL verification is not)
- `OfflineSyncView` with Bankak payment method requiring account validation
- `cancel_sale` service — no test exists for the cancellation flow
- `create_sale` with `business_type=RESTAURANT` (skips stock operations) — not tested
- Subscription feature-gating in sales or customers (only tested in inventory)

---

*Testing analysis: 2026-05-19*
