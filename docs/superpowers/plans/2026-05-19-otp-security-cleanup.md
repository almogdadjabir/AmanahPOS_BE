# OTP Security Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the legacy plaintext OTP flow entirely, add a production safety guard for TEST_PHONE, and ensure Redis failures are visible rather than silent for OTP operations.

**Architecture:** Three independent tasks — (1) delete dead code (legacy views/services/utils), (2) add startup guard against TEST_PHONE in production, (3) harden the health check to surface Redis failures clearly. Each task produces a working, committable change on its own. No new models, no migrations.

**Tech Stack:** Django 5.0.6, DRF 3.15.2, Redis (django-redis cache), pytest + `--no-migrations`

---

## File Map

| File | Change |
|---|---|
| `backend/apps/accounts/views.py` | Remove `OTPVerifyView`, `ResendOTPView`; remove legacy imports |
| `backend/apps/accounts/public_urls.py` | Remove `verify-otp/` and `resend-otp/` routes |
| `backend/apps/accounts/services.py` | Remove `send_otp`, `verify_otp`, `login_with_otp`; remove legacy imports |
| `backend/apps/core/utils.py` | Remove `store_otp_in_redis`, `get_otp_from_redis`, `delete_otp_from_redis`, `verify_otp_from_redis`, `set_otp_cooldown`, `get_otp_cooldown_remaining`, `send_sms_otp`, `_send_twilio_sms`; keep `_send_budgetsms` only if used elsewhere |
| `backend/config/settings/base.py` | Remove `TEST_PHONE`, `TEST_OTP`, `TWILIO_FROM_NUMBER` settings |
| `backend/config/settings/production.py` | Add startup guard: raise `ImproperlyConfigured` if `TEST_PHONE` is set and `DEBUG=False` |
| `backend/apps/core/urls.py` | Health check already covers Redis — no change needed |
| `backend/apps/accounts/tests/test_login_otp_v2.py` | Update test descriptions; add test that legacy URLs return 404; add test that TEST_PHONE guard raises in production mode |
| `backend/apps/accounts/tests/test_otp_security.py` | New test file for security-specific scenarios |

---

## Task 1: Remove legacy OTP endpoints and views

**Files:**
- Modify: `backend/apps/accounts/public_urls.py`
- Modify: `backend/apps/accounts/views.py`
- Modify: `backend/apps/accounts/services.py`
- Test: `backend/apps/accounts/tests/test_otp_security.py`

- [ ] **Step 1: Write failing tests confirming legacy URLs currently exist**

Create `backend/apps/accounts/tests/test_otp_security.py`:

```python
"""
OTP security tests: legacy endpoint removal, brute-force protection, TEST_PHONE guard.
"""
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser


def make_active_user(phone="+249912200010"):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Test", role="owner", is_active=True,
    )


OTP_SETTINGS = {
    "OTP_PROVIDER": "stub",
    "DEFAULT_OTP_CHANNEL": "sms",
    "OTP_ALLOWED_CHANNELS": ["sms", "whatsapp"],
    "OTP_MAX_ATTEMPTS": 5,
    "OTP_RESEND_COOLDOWN_SECONDS": 60,
    "OTP_EXPIRY_SECONDS": 300,
    "OTP_LENGTH": 6,
}


# ─── Task 1: Legacy endpoints must not exist ──────────────────────────────────

@override_settings(**OTP_SETTINGS)
class TestLegacyEndpointsRemoved(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_verify_otp_endpoint_does_not_exist(self):
        """POST /api-public/v1/auth/verify-otp/ must return 404 after removal."""
        resp = self.client.post(
            "/api-public/v1/auth/verify-otp/",
            {"phone": "+249912200010", "otp": "123456"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_resend_otp_endpoint_does_not_exist(self):
        """POST /api-public/v1/auth/resend-otp/ must return 404 after removal."""
        resp = self.client.post(
            "/api-public/v1/auth/resend-otp/",
            {"phone": "+249912200010"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)
```

- [ ] **Step 2: Run tests to confirm they FAIL (endpoints currently return 200/400, not 404)**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/backend && \
DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/accounts/tests/test_otp_security.py::TestLegacyEndpointsRemoved -v --no-migrations 2>&1 | tail -10
```

Expected: FAIL — both return something other than 404.

- [ ] **Step 3: Remove legacy URL routes from `public_urls.py`**

Open `backend/apps/accounts/public_urls.py`. It currently looks like:

```python
path("verify-otp/", views.OTPVerifyView.as_view(), name="verify_otp"),
path("resend-otp/", views.ResendOTPView.as_view(), name="resend_otp"),
```

Remove both lines. The file after the change should contain only:

```python
from django.urls import path
from . import views

app_name = "accounts_public"

urlpatterns = [
    path("login/otp/",        views.LoginOTPRequestView.as_view(),  name="login_otp_request"),
    path("login/otp/verify/", views.LoginOTPVerifyView.as_view(),   name="login_otp_verify"),
    path("login/password/",   views.LoginPasswordView.as_view(),    name="login_password"),
    path("token/refresh/",    views.TokenRefreshView.as_view(),     name="token_refresh"),
]
```

> **Note:** Check the actual file first (`cat backend/apps/accounts/public_urls.py`) — keep any routes you don't recognise (e.g. token refresh). Only remove `verify-otp/` and `resend-otp/`.

- [ ] **Step 4: Remove `OTPVerifyView` and `ResendOTPView` from `views.py`**

In `backend/apps/accounts/views.py`:

1. Remove these two class definitions entirely (lines ~94–143):

```python
class OTPVerifyView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = verify_otp(phone=data["phone"], otp=data["otp"])
        tokens = get_tokens_for_user(user)

        return Response(
            {
                "success": True,
                "message": "Phone verified successfully.",
                "data": {
                    "access": tokens["access"],
                    "refresh": tokens["refresh"],
                    "user": UserProfileSerializer(user).data,
                },
            },
            status=status.HTTP_200_OK,
        )


class ResendOTPView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]

        if not CustomUser.objects.filter(phone=phone).exists():
            raise BusinessLogicError("No account found for this phone number.")

        send_otp(phone)

        return Response(
            {
                "success": True,
                "message": "OTP resent to your phone.",
            },
            status=status.HTTP_200_OK,
        )
```

2. Remove these imports from the top of `views.py` (they are only used by the removed views):

```python
    login_with_otp,    # remove
    send_otp,          # remove
    verify_otp,        # remove
```

Also remove serializer imports that are only used by the removed views:
```python
    OTPVerifySerializer,   # remove
    ResendOTPSerializer,   # remove
```

- [ ] **Step 5: Remove legacy service functions from `services.py`**

In `backend/apps/accounts/services.py`:

1. Remove the entire `send_otp` function (lines ~124–149).
2. Remove the entire `verify_otp` function (lines ~261–288).
3. Remove the entire `login_with_otp` function (lines ~291–326).

4. Remove these imports from the top of `services.py` (only used by the removed functions):

```python
    get_otp_from_redis,      # remove
    send_sms_otp,            # remove
    set_otp_cooldown,        # remove
    store_otp_in_redis,      # remove
    verify_otp_from_redis,   # remove
```

- [ ] **Step 6: Remove legacy helper functions from `core/utils.py`**

In `backend/apps/core/utils.py`, remove these functions entirely:

```python
def store_otp_in_redis(phone: str, otp: str, expiry_seconds: int | None = None) -> None: ...
def get_otp_from_redis(phone: str) -> str | None: ...
def delete_otp_from_redis(phone: str) -> None: ...
def set_otp_cooldown(phone: str, seconds: int | None = None) -> None: ...
def get_otp_cooldown_remaining(phone: str) -> int: ...  # legacy non-channel version
def verify_otp_from_redis(phone: str, otp: str) -> bool: ...
def send_sms_otp(phone: str, otp: str) -> bool: ...
def _send_twilio_sms(phone: str, message: str) -> bool: ...
```

> **Important:** Keep `_send_budgetsms` — check if it is used elsewhere:
> ```bash
> grep -rn "_send_budgetsms\|budgetsms" backend/ --include="*.py" | grep -v "core/utils.py"
> ```
> If it has no callers outside `core/utils.py`, remove it too. If it does, keep it.

Also remove the legacy `# ─── SMS ───` section header comment if it only contained the above functions.

- [ ] **Step 7: Run the endpoint tests to confirm they pass now**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/backend && \
DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/accounts/tests/test_otp_security.py::TestLegacyEndpointsRemoved -v --no-migrations 2>&1 | tail -10
```

Expected: PASS (both return 404).

- [ ] **Step 8: Run the full existing OTP test suite to confirm no regressions**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/backend && \
DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/accounts/tests/test_login_otp_v2.py -v --no-migrations 2>&1 | tail -15
```

Expected: All pass. If any import errors occur, check that you didn't remove a function that the existing tests import directly (e.g. `store_channel_otp`, `_channel_otp_key` — these are the **current** helpers, not legacy, and must stay).

- [ ] **Step 9: Commit**

```bash
git add backend/apps/accounts/public_urls.py \
        backend/apps/accounts/views.py \
        backend/apps/accounts/services.py \
        backend/apps/core/utils.py \
        backend/apps/accounts/tests/test_otp_security.py
git commit -m "feat: remove legacy plaintext OTP endpoints and service functions

- Remove /auth/verify-otp/ and /auth/resend-otp/ endpoints (no brute-force protection)
- Remove OTPVerifyView, ResendOTPView, send_otp, verify_otp, login_with_otp
- Remove store_otp_in_redis, get_otp_from_redis, delete_otp_from_redis,
  verify_otp_from_redis, set_otp_cooldown, send_sms_otp, _send_twilio_sms
- All OTP flows now use request_login_otp/verify_login_otp (HMAC-SHA256, attempt counter)
- Add regression tests confirming legacy URLs return 404"
```

---

## Task 2: Production safety guard for TEST_PHONE

**Files:**
- Modify: `backend/config/settings/base.py`
- Modify: `backend/config/settings/production.py` (or `apps/core/apps.py`)
- Test: `backend/apps/accounts/tests/test_otp_security.py`

The `TEST_PHONE` bypass in `send_otp` was removed in Task 1 along with `send_otp` itself. However, `TEST_PHONE` and `TEST_OTP` are still declared in `base.py`, and there is no code-level protection preventing them being set in production. This task adds a startup check.

- [ ] **Step 1: Write the failing test**

Append to `backend/apps/accounts/tests/test_otp_security.py`:

```python
# ─── Task 2: TEST_PHONE production guard ─────────────────────────────────────

class TestTestPhoneProductionGuard(TestCase):
    def test_test_phone_raises_when_debug_false(self):
        """
        If TEST_PHONE is set and DEBUG=False, Django startup must raise ImproperlyConfigured.
        This is enforced in production.py via AppConfig.ready().
        """
        from django.core.exceptions import ImproperlyConfigured
        from apps.accounts.apps import AccountsConfig

        # Simulate the ready() check with DEBUG=False and TEST_PHONE set
        with self.settings(DEBUG=False, TEST_PHONE="+249999999999"):
            with self.assertRaises(ImproperlyConfigured):
                AccountsConfig._check_test_phone_safety()

    def test_test_phone_allowed_when_debug_true(self):
        """TEST_PHONE is permitted in DEBUG mode (local dev only)."""
        from apps.accounts.apps import AccountsConfig

        # Should not raise
        with self.settings(DEBUG=True, TEST_PHONE="+249999999999"):
            AccountsConfig._check_test_phone_safety()  # no exception

    def test_no_test_phone_is_always_fine(self):
        """TEST_PHONE unset is always safe."""
        from apps.accounts.apps import AccountsConfig

        with self.settings(DEBUG=False, TEST_PHONE=""):
            AccountsConfig._check_test_phone_safety()  # no exception
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/backend && \
DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/accounts/tests/test_otp_security.py::TestTestPhoneProductionGuard -v --no-migrations 2>&1 | tail -10
```

Expected: FAIL — `AccountsConfig._check_test_phone_safety` does not exist.

- [ ] **Step 3: Find the AccountsConfig and add the safety check**

Open `backend/apps/accounts/apps.py`. It probably looks like:

```python
from django.apps import AppConfig

class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
```

Replace it with:

```python
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"

    def ready(self):
        self._check_test_phone_safety()

    @staticmethod
    def _check_test_phone_safety():
        from django.conf import settings
        from django.core.exceptions import ImproperlyConfigured
        if not settings.DEBUG and getattr(settings, "TEST_PHONE", ""):
            raise ImproperlyConfigured(
                "TEST_PHONE must not be set when DEBUG=False. "
                "Remove TEST_PHONE from your production environment variables."
            )
```

- [ ] **Step 4: Remove TEST_PHONE and TEST_OTP from base.py settings**

In `backend/config/settings/base.py`, remove these two lines:

```python
TEST_PHONE = env("TEST_PHONE", default="")
TEST_OTP   = env("TEST_OTP",   default="222222")
```

And remove the comment above them:
```python
# Single test-account bypass — unset TEST_PHONE to disable
```

Also remove:
```python
TWILIO_FROM_NUMBER    = env("TWILIO_FROM_NUMBER", default="")    # legacy
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/backend && \
DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/accounts/tests/test_otp_security.py::TestTestPhoneProductionGuard -v --no-migrations 2>&1 | tail -10
```

Expected: PASS (3 tests).

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/backend && \
DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/accounts/tests/ -v --no-migrations 2>&1 | tail -15
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/accounts/apps.py \
        backend/config/settings/base.py \
        backend/apps/accounts/tests/test_otp_security.py
git commit -m "feat: add startup guard — TEST_PHONE raises ImproperlyConfigured when DEBUG=False

Prevents test account bypass from ever reaching production.
Also removes TEST_PHONE, TEST_OTP, TWILIO_FROM_NUMBER from settings (all legacy)."
```

---

## Task 3: Make Redis OTP failures visible (not silently swallowed)

**Files:**
- Modify: `backend/config/settings/base.py` — change `IGNORE_EXCEPTIONS` for cache
- Modify: `backend/apps/core/utils.py` — add explicit Redis health wrapper for OTP store
- Modify: `backend/apps/core/urls.py` — health check already covers Redis; verify it surfaces errors correctly
- Test: `backend/apps/accounts/tests/test_otp_security.py`

Currently `IGNORE_EXCEPTIONS: True` in the Redis cache config means `cache.set()` silently returns `None` if Redis is down. The OTP is not stored, but no error is raised or logged. The OTP verification then returns `INVALID_OTP` with no indication of why.

The fix: change `IGNORE_EXCEPTIONS` to `False` in production so cache failures surface as exceptions, then catch them in `store_channel_otp` and raise `OTPDeliveryFailedError` (which returns HTTP 503) instead of letting the flow silently produce a broken OTP.

- [ ] **Step 1: Write failing tests**

Append to `backend/apps/accounts/tests/test_otp_security.py`:

```python
# ─── Task 3: Redis failure visibility ────────────────────────────────────────

from unittest.mock import patch
from django.core.cache import cache as django_cache

@override_settings(**OTP_SETTINGS)
class TestRedisFailureVisibility(TestCase):
    def setUp(self):
        self.client = APIClient()
        make_active_user("+249912200011")

    def test_otp_request_returns_503_when_redis_unavailable(self):
        """
        If Redis is down during OTP request, the endpoint must return 503
        (OTP_DELIVERY_FAILED) rather than silently returning 200 with a broken OTP.
        """
        with patch("apps.core.utils.cache") as mock_cache:
            mock_cache.set.side_effect = Exception("Redis connection refused")
            resp = self.client.post(
                "/api-public/v1/auth/login/otp/",
                {"phone": "+249912200011", "channel": "sms"},
                format="json",
            )
        self.assertEqual(resp.status_code, 503)
        self.assertFalse(resp.data["success"])
        self.assertEqual(resp.data["error"]["code"], "OTP_DELIVERY_FAILED")
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/backend && \
DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/accounts/tests/test_otp_security.py::TestRedisFailureVisibility -v --no-migrations 2>&1 | tail -10
```

Expected: FAIL — currently returns 200 (Redis exception is swallowed).

- [ ] **Step 3: Wrap `store_channel_otp` to surface Redis failures**

In `backend/apps/core/utils.py`, find `store_channel_otp` (around line 123). It currently does:

```python
def store_channel_otp(phone: str, otp: str, channel: str, expiry_seconds: int | None = None) -> None:
    expiry = expiry_seconds or getattr(settings, "OTP_EXPIRY_SECONDS", 300)
    key = _channel_otp_key(channel, phone)
    cache.set(key, _hash_otp(phone, otp), timeout=expiry)
```

Replace with:

```python
def store_channel_otp(phone: str, otp: str, channel: str, expiry_seconds: int | None = None) -> None:
    from apps.core.exceptions import OTPDeliveryFailedError
    expiry = expiry_seconds or getattr(settings, "OTP_EXPIRY_SECONDS", 300)
    key = _channel_otp_key(channel, phone)
    try:
        cache.set(key, _hash_otp(phone, otp), timeout=expiry)
    except Exception as exc:
        logger.error("Redis unavailable — OTP store failed for %s: %s", mask_phone(phone), exc)
        raise OTPDeliveryFailedError()
```

- [ ] **Step 4: Change `IGNORE_EXCEPTIONS` to `False` in production cache config**

In `backend/config/settings/base.py`, find the Redis cache configuration (around line 170):

```python
"IGNORE_EXCEPTIONS": True,
```

Change it to:

```python
"IGNORE_EXCEPTIONS": False,
```

> **Why:** With `IGNORE_EXCEPTIONS: True`, Redis failures return `None` silently. With `False`, they raise an exception that `store_channel_otp` can catch and convert to a proper HTTP 503. The health check at `/api/v1/health/` already catches Redis exceptions and marks status as `degraded`.

- [ ] **Step 5: Run the Redis failure test**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/backend && \
DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/accounts/tests/test_otp_security.py::TestRedisFailureVisibility -v --no-migrations 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 6: Run all security tests and OTP tests**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/backend && \
DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/accounts/tests/ -v --no-migrations 2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 7: Verify health check still works with the new IGNORE_EXCEPTIONS=False**

The health check in `backend/apps/core/urls.py` wraps Redis in `try/except`, so it already handles Redis-down correctly. Confirm it is unchanged and correct:

```bash
grep -A 10 "Cache/Redis check" /Users/almogdadjabir/Documents/projects/AmanaPOS/backend/apps/core/urls.py
```

Expected output: the `try/except` block that sets `health["checks"]["cache"] = "error"` and `health["status"] = "degraded"` on any exception. No change needed.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/core/utils.py \
        backend/config/settings/base.py \
        backend/apps/accounts/tests/test_otp_security.py
git commit -m "feat: surface Redis failures as OTP_DELIVERY_FAILED (503) instead of silent 200

- store_channel_otp now catches cache exceptions and raises OTPDeliveryFailedError
- Changed IGNORE_EXCEPTIONS to False so Redis errors are not swallowed globally
- Added test: Redis down during OTP request returns 503 not silent 200"
```

---

## Task 4: Add brute-force protection test coverage

**Files:**
- Test: `backend/apps/accounts/tests/test_otp_security.py`

The max-attempts lockout is already implemented in `verify_login_otp`. This task adds explicit tests to confirm the lockout works and cannot be bypassed via the OTP request endpoint.

- [ ] **Step 1: Append tests**

Append to `backend/apps/accounts/tests/test_otp_security.py`:

```python
# ─── Task 4: Brute-force protection ──────────────────────────────────────────

from django.core.cache import cache as django_cache
from apps.core.utils import store_channel_otp, _channel_attempts_key

@override_settings(**{**OTP_SETTINGS, "OTP_MAX_ATTEMPTS": 3})
class TestBruteForceProtection(TestCase):
    def setUp(self):
        self.client = APIClient()
        django_cache.clear()
        self.user = make_active_user("+249912200012")

    def test_lockout_after_max_wrong_attempts(self):
        """After OTP_MAX_ATTEMPTS wrong guesses, verify endpoint returns INVALID_OTP (locked)."""
        store_channel_otp("+249912200012", "111111", "sms")

        for _ in range(3):
            self.client.post(
                "/api-public/v1/auth/login/otp/verify/",
                {"phone": "+249912200012", "otp": "999999", "channel": "sms"},
                format="json",
            )

        # After 3 wrong attempts, even the correct OTP should fail (OTP deleted on lockout)
        resp = self.client.post(
            "/api-public/v1/auth/login/otp/verify/",
            {"phone": "+249912200012", "otp": "111111", "channel": "sms"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["error"]["code"], "INVALID_OTP")

    def test_wrong_otp_increments_attempts_counter(self):
        """Each wrong OTP guess increments the attempt counter."""
        from apps.core.utils import get_otp_attempts
        store_channel_otp("+249912200012", "111111", "sms")

        self.client.post(
            "/api-public/v1/auth/login/otp/verify/",
            {"phone": "+249912200012", "otp": "000000", "channel": "sms"},
            format="json",
        )
        self.assertEqual(get_otp_attempts("+249912200012", "sms"), 1)

    def test_correct_otp_resets_attempts(self):
        """Successful OTP verification resets the attempts counter."""
        from apps.core.utils import get_otp_attempts
        store_channel_otp("+249912200012", "111111", "sms")

        resp = self.client.post(
            "/api-public/v1/auth/login/otp/verify/",
            {"phone": "+249912200012", "otp": "111111", "channel": "sms"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(get_otp_attempts("+249912200012", "sms"), 0)

    def test_otp_stored_as_hash_not_plaintext(self):
        """OTP in Redis must be a 64-char hex hash, never a plain digit string."""
        store_channel_otp("+249912200012", "111111", "sms")
        from apps.core.utils import _channel_otp_key
        stored = django_cache.get(_channel_otp_key("sms", "+249912200012"))
        self.assertIsNotNone(stored)
        self.assertEqual(len(stored), 64)
        self.assertNotRegex(stored, r"^\d{4,8}$")
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/backend && \
DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/accounts/tests/test_otp_security.py::TestBruteForceProtection -v --no-migrations 2>&1 | tail -15
```

Expected: All 4 pass.

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/backend && \
DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/accounts/tests/ apps/sales/tests/ -v --no-migrations 2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add backend/apps/accounts/tests/test_otp_security.py
git commit -m "test: add brute-force protection and OTP hashing security tests"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| Remove /auth/verify-otp/ and /auth/resend-otp/ | Task 1 |
| Remove OTPVerifyView, ResendOTPView | Task 1 |
| Remove send_otp, verify_otp, login_with_otp | Task 1 |
| Remove store_otp_in_redis, get_otp_from_redis, delete_otp_from_redis, verify_otp_from_redis | Task 1 |
| All login OTP flows use request_login_otp / verify_login_otp | Task 1 (legacy removed; current flow unchanged) |
| Remove _send_twilio_sms, send_sms_otp, TWILIO_FROM_NUMBER | Task 1 |
| All SMS/WhatsApp OTP delivery via accounts/otp/providers.py | Already true; verified by keeping providers.py unchanged |
| TEST_PHONE raises ImproperlyConfigured when DEBUG=False | Task 2 |
| Redis failure visible, not silently swallowed for OTP | Task 3 |
| Health check verifies Redis | Already done in core/urls.py — verified in Task 3 step 7 |
| Tests: request OTP, verify correct, reject wrong, enforce max attempts | Task 4 |
| Tests: lockout after max attempts | Task 4 |
| Tests: legacy endpoints return 404 | Task 1 |
| Tests: TEST_PHONE blocked when DEBUG=False | Task 2 |
| OTP stored as hash not plaintext | Task 4 (test_otp_stored_as_hash_not_plaintext) |

**No placeholders found.**

**Type consistency:** `store_channel_otp` raises `OTPDeliveryFailedError` (defined in `apps/core/exceptions.py`, already imported in `request_login_otp` in services.py). `_check_test_phone_safety` is a `@staticmethod` called both from `ready()` and directly in tests. Consistent.
