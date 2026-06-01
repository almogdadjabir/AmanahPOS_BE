# WhatsApp OTP Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing OTP login flow to support both SMS and WhatsApp channels, harden OTP storage with HMAC-SHA256, add per-channel Redis keys, and enforce a max-attempts lockout — without ever revealing whether a phone number is registered.

**Architecture:** Add a provider abstraction (`BaseOtpSender` → `StubOtpSender` / `TwilioOtpSender`) selected by `OTP_PROVIDER` setting. New helper functions in `core/utils.py` write/read hashed OTPs under per-channel Redis keys (`otp_v2:{channel}:{phone}`). Two new service functions (`request_login_otp`, `verify_login_otp`) replace the inline logic in the views. Views are updated to pass `channel` through; the generic success response prevents phone enumeration.

**Tech Stack:** Django 5.0.6 · DRF 3.15.2 · SimpleJWT · Redis (Django cache) · Twilio Messages API · pytest/Django TestCase

---

## File Map

| Action | File |
|--------|------|
| Modify | `backend/apps/core/exceptions.py` |
| Modify | `backend/apps/core/utils.py` |
| Create | `backend/apps/accounts/otp/__init__.py` |
| Create | `backend/apps/accounts/otp/base.py` |
| Create | `backend/apps/accounts/otp/stub.py` |
| Create | `backend/apps/accounts/otp/twilio.py` |
| Create | `backend/apps/accounts/otp/factory.py` |
| Modify | `backend/config/settings/base.py` |
| Modify | `backend/apps/accounts/services.py` |
| Modify | `backend/apps/accounts/serializers.py` |
| Modify | `backend/apps/accounts/views.py` |
| Create | `backend/apps/accounts/tests/test_login_otp_v2.py` |

---

## Task 1: Add `OTPMaxAttemptsError` exception

**Files:**
- Modify: `backend/apps/core/exceptions.py`
- Test: `backend/apps/accounts/tests/test_login_otp_v2.py` (import check only)

- [ ] **Step 1: Write the failing test**

Create `backend/apps/accounts/tests/test_login_otp_v2.py`:

```python
"""
Tests: WhatsApp/SMS OTP login — channel support, hashing, enumeration, lockout.
"""
from django.test import TestCase


class TestImports(TestCase):
    def test_otp_max_attempts_error_importable(self):
        from apps.core.exceptions import OTPMaxAttemptsError
        self.assertEqual(OTPMaxAttemptsError.default_code, "OTP_MAX_ATTEMPTS")
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend
python -m pytest apps/accounts/tests/test_login_otp_v2.py::TestImports -v
```

Expected: `ImportError: cannot import name 'OTPMaxAttemptsError'`

- [ ] **Step 3: Add `OTPMaxAttemptsError` to `backend/apps/core/exceptions.py`**

Append after `OTPCooldownError`:

```python
class OTPMaxAttemptsError(BusinessLogicError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = "Too many incorrect attempts. Please request a new OTP."
    default_code = "OTP_MAX_ATTEMPTS"
```

- [ ] **Step 4: Run to confirm pass**

```bash
python -m pytest apps/accounts/tests/test_login_otp_v2.py::TestImports -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add apps/core/exceptions.py apps/accounts/tests/test_login_otp_v2.py
git commit -m "feat: add OTPMaxAttemptsError exception"
```

---

## Task 2: Add per-channel hashed OTP helpers to `core/utils.py`

**Files:**
- Modify: `backend/apps/core/utils.py`
- Test: `backend/apps/accounts/tests/test_login_otp_v2.py`

- [ ] **Step 1: Write the failing tests**

Replace the content of `test_login_otp_v2.py` with the full test file stub (keep the import test, add utils tests):

```python
"""
Tests: WhatsApp/SMS OTP login — channel support, hashing, enumeration, lockout.
"""
import hmac
from hashlib import sha256

from django.conf import settings
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.core.exceptions import OTPMaxAttemptsError

REQUEST_URL = "/api-public/v1/auth/login/otp/"
VERIFY_URL  = "/api-public/v1/auth/login/otp/verify/"


# ── Test settings override ────────────────────────────────────────────────────
OTP_TEST_SETTINGS = {
    "OTP_PROVIDER":              "stub",
    "DEFAULT_OTP_CHANNEL":       "sms",
    "OTP_ALLOWED_CHANNELS":      ["sms", "whatsapp"],
    "OTP_MAX_ATTEMPTS":          3,
    "OTP_RESEND_COOLDOWN_SECONDS": 60,
    "OTP_EXPIRY_SECONDS":        300,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_user(phone="+249912200001", is_active=True):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Test User", role="owner", is_active=is_active,
    )


class TestOtpUtils(TestCase):
    """Unit tests for per-channel hashed OTP helpers."""

    def setUp(self):
        cache.clear()

    def test_hash_otp_deterministic(self):
        from apps.core.utils import _hash_otp
        h1 = _hash_otp("+249912200001", "123456")
        h2 = _hash_otp("+249912200001", "123456")
        self.assertEqual(h1, h2)

    def test_hash_otp_differs_by_phone(self):
        from apps.core.utils import _hash_otp
        h1 = _hash_otp("+249912200001", "123456")
        h2 = _hash_otp("+249912200002", "123456")
        self.assertNotEqual(h1, h2)

    def test_hash_otp_differs_by_otp(self):
        from apps.core.utils import _hash_otp
        h1 = _hash_otp("+249912200001", "123456")
        h2 = _hash_otp("+249912200001", "654321")
        self.assertNotEqual(h1, h2)

    def test_store_and_verify_ok(self):
        from apps.core.utils import store_otp_hashed, verify_and_consume_otp
        store_otp_hashed("+249912200001", "123456", "sms")
        result = verify_and_consume_otp("+249912200001", "123456", "sms")
        self.assertEqual(result, "ok")

    def test_verify_wrong_otp_returns_invalid(self):
        from apps.core.utils import store_otp_hashed, verify_and_consume_otp
        store_otp_hashed("+249912200001", "123456", "sms")
        result = verify_and_consume_otp("+249912200001", "999999", "sms")
        self.assertEqual(result, "invalid")

    def test_verify_expired_returns_expired(self):
        from apps.core.utils import verify_and_consume_otp
        result = verify_and_consume_otp("+249912200001", "123456", "sms")
        self.assertEqual(result, "expired")

    def test_verify_consume_prevents_reuse(self):
        from apps.core.utils import store_otp_hashed, verify_and_consume_otp
        store_otp_hashed("+249912200001", "123456", "sms")
        verify_and_consume_otp("+249912200001", "123456", "sms")
        result = verify_and_consume_otp("+249912200001", "123456", "sms")
        self.assertEqual(result, "expired")

    def test_channel_isolation(self):
        from apps.core.utils import store_otp_hashed, verify_and_consume_otp
        store_otp_hashed("+249912200001", "123456", "sms")
        result = verify_and_consume_otp("+249912200001", "123456", "whatsapp")
        self.assertEqual(result, "expired")

    @override_settings(**OTP_TEST_SETTINGS)
    def test_increment_and_reset_attempts(self):
        from apps.core.utils import increment_otp_attempts, reset_otp_attempts
        count = increment_otp_attempts("+249912200001", "sms")
        self.assertEqual(count, 1)
        count = increment_otp_attempts("+249912200001", "sms")
        self.assertEqual(count, 2)
        reset_otp_attempts("+249912200001", "sms")
        count = increment_otp_attempts("+249912200001", "sms")
        self.assertEqual(count, 1)


class TestImports(TestCase):
    def test_otp_max_attempts_error_importable(self):
        self.assertEqual(OTPMaxAttemptsError.default_code, "OTP_MAX_ATTEMPTS")
```

- [ ] **Step 2: Run to confirm failures**

```bash
python -m pytest apps/accounts/tests/test_login_otp_v2.py::TestOtpUtils -v
```

Expected: `ImportError` for `_hash_otp`, `store_otp_hashed`, etc.

- [ ] **Step 3: Add helpers to `backend/apps/core/utils.py`**

Add at the top of the file, after the existing imports:

```python
import hmac as _hmac
from hashlib import sha256 as _sha256
```

Add the following block after the existing `# ─── OTP ───` section (after `verify_otp_from_redis`):

```python
# ─── Per-channel hashed OTP (v2) ──────────────────────────────────────────────

def _otp_v2_key(channel: str, phone: str) -> str:
    return f"otp_v2:{channel}:{phone}"


def _cooldown_v2_key(channel: str, phone: str) -> str:
    return f"otp_cooldown:{channel}:{phone}"


def _attempts_key(channel: str, phone: str) -> str:
    return f"otp_attempts:{channel}:{phone}"


def _hash_otp(phone: str, otp: str) -> str:
    """HMAC-SHA256 keyed by SECRET_KEY+phone. Never store the raw OTP."""
    key = (settings.SECRET_KEY + phone).encode()
    return _hmac.new(key, otp.encode(), _sha256).hexdigest()


def store_otp_hashed(phone: str, otp: str, channel: str, expiry_seconds: int | None = None) -> None:
    """Store HMAC-hashed OTP under otp_v2:{channel}:{phone}."""
    expiry = expiry_seconds or getattr(settings, "OTP_EXPIRY_SECONDS", 300)
    cache.set(_otp_v2_key(channel, phone), _hash_otp(phone, otp), timeout=expiry)
    logger.debug("Hashed OTP stored for channel=%s (expires in %ds)", channel, expiry)


def verify_and_consume_otp(phone: str, otp: str, channel: str) -> str:
    """
    Verify and consume a hashed OTP from Redis.

    Returns one of: "ok" | "expired" | "invalid"
    OTP is deleted from Redis only on "ok".
    """
    key = _otp_v2_key(channel, phone)
    stored_hash = cache.get(key)
    if stored_hash is None:
        return "expired"
    computed = _hash_otp(phone, otp)
    if not _hmac.compare_digest(computed, stored_hash):
        return "invalid"
    cache.delete(key)
    return "ok"


def set_channel_cooldown(phone: str, channel: str, seconds: int | None = None) -> None:
    """Set per-channel OTP resend cooldown."""
    ttl = seconds or getattr(settings, "OTP_RESEND_COOLDOWN_SECONDS", 60)
    cache.set(_cooldown_v2_key(channel, phone), 1, timeout=ttl)


def get_channel_cooldown_remaining(phone: str, channel: str) -> int:
    """Return seconds left on the per-channel cooldown, 0 if none active."""
    key = _cooldown_v2_key(channel, phone)
    if hasattr(cache, "ttl"):
        ttl = cache.ttl(key)
        return max(0, ttl) if ttl else 0
    return 0 if cache.get(key) is None else 60


def increment_otp_attempts(phone: str, channel: str) -> int:
    """Increment the failed-attempt counter; returns the new count."""
    key = _attempts_key(channel, phone)
    try:
        return cache.incr(key)
    except ValueError:
        expiry = getattr(settings, "OTP_EXPIRY_SECONDS", 300)
        cache.set(key, 1, timeout=expiry)
        return 1


def reset_otp_attempts(phone: str, channel: str) -> None:
    """Clear the failed-attempt counter (called on success or new OTP issue)."""
    cache.delete(_attempts_key(channel, phone))
```

- [ ] **Step 4: Run to confirm pass**

```bash
python -m pytest apps/accounts/tests/test_login_otp_v2.py::TestOtpUtils -v
```

Expected: all `TestOtpUtils` tests `PASSED`

- [ ] **Step 5: Commit**

```bash
git add apps/core/utils.py apps/accounts/tests/test_login_otp_v2.py
git commit -m "feat: add per-channel hashed OTP helpers (HMAC-SHA256)"
```

---

## Task 3: Create OTP provider abstraction package

**Files:**
- Create: `backend/apps/accounts/otp/__init__.py`
- Create: `backend/apps/accounts/otp/base.py`
- Create: `backend/apps/accounts/otp/stub.py`
- Create: `backend/apps/accounts/otp/twilio.py`
- Create: `backend/apps/accounts/otp/factory.py`

- [ ] **Step 1: Write the failing test**

Add to `test_login_otp_v2.py`, after `TestOtpUtils`:

```python
class TestOtpProvider(TestCase):
    @override_settings(OTP_PROVIDER="stub")
    def test_stub_sender_returns_base_instance(self):
        from apps.accounts.otp.factory import get_otp_sender
        from apps.accounts.otp.base import BaseOtpSender
        sender = get_otp_sender()
        self.assertIsInstance(sender, BaseOtpSender)

    @override_settings(OTP_PROVIDER="twilio")
    def test_twilio_sender_returns_base_instance(self):
        from apps.accounts.otp.factory import get_otp_sender
        from apps.accounts.otp.base import BaseOtpSender
        sender = get_otp_sender()
        self.assertIsInstance(sender, BaseOtpSender)

    @override_settings(OTP_PROVIDER="stub")
    def test_stub_send_does_not_raise(self):
        from apps.accounts.otp.stub import StubOtpSender
        sender = StubOtpSender()
        sender.send("+249912200001", "123456", "sms")   # must not raise
        sender.send("+249912200001", "123456", "whatsapp")
```

- [ ] **Step 2: Run to confirm failure**

```bash
python -m pytest apps/accounts/tests/test_login_otp_v2.py::TestOtpProvider -v
```

Expected: `ModuleNotFoundError: No module named 'apps.accounts.otp'`

- [ ] **Step 3: Create the provider package**

`backend/apps/accounts/otp/__init__.py` — empty file.

`backend/apps/accounts/otp/base.py`:

```python
from abc import ABC, abstractmethod


class BaseOtpSender(ABC):
    @abstractmethod
    def send(self, phone: str, otp: str, channel: str) -> None:
        """Deliver OTP to phone via channel ('sms' or 'whatsapp')."""
```

`backend/apps/accounts/otp/stub.py`:

```python
import logging
from .base import BaseOtpSender

logger = logging.getLogger(__name__)


class StubOtpSender(BaseOtpSender):
    def send(self, phone: str, otp: str, channel: str) -> None:
        logger.info("[OTP STUB] channel=%s to=%s (OTP redacted)", channel, phone)
```

`backend/apps/accounts/otp/twilio.py`:

```python
import logging

from django.conf import settings

from apps.core.utils import mask_phone
from .base import BaseOtpSender

logger = logging.getLogger(__name__)


class TwilioOtpSender(BaseOtpSender):
    def send(self, phone: str, otp: str, channel: str) -> None:
        from twilio.rest import Client

        if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN]):
            raise RuntimeError("Twilio credentials not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)")

        minutes = settings.OTP_EXPIRY_SECONDS // 60
        message = f"رمز AmanaPOS هو {otp}. صالح {minutes} دقائق. لا تشاركه مع أحد."
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        try:
            if channel == "whatsapp":
                if not settings.TWILIO_WHATSAPP_NUMBER:
                    raise RuntimeError("TWILIO_WHATSAPP_NUMBER not configured")
                client.messages.create(
                    body=message,
                    from_=f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}",
                    to=f"whatsapp:{phone}",
                )
            else:
                if not settings.TWILIO_FROM_NUMBER:
                    raise RuntimeError("TWILIO_FROM_NUMBER not configured")
                client.messages.create(
                    body=message,
                    from_=settings.TWILIO_FROM_NUMBER,
                    to=phone,
                )
            logger.info("OTP sent via Twilio/%s to %s", channel, mask_phone(phone))
        except Exception:
            logger.exception("Twilio OTP delivery failed: channel=%s phone=%s", channel, mask_phone(phone))
            raise
```

`backend/apps/accounts/otp/factory.py`:

```python
from django.conf import settings

from .base import BaseOtpSender
from .stub import StubOtpSender
from .twilio import TwilioOtpSender


def get_otp_sender() -> BaseOtpSender:
    """Return the configured OTP sender based on OTP_PROVIDER setting."""
    provider = getattr(settings, "OTP_PROVIDER", "stub")
    if provider == "twilio":
        return TwilioOtpSender()
    return StubOtpSender()
```

- [ ] **Step 4: Run to confirm pass**

```bash
python -m pytest apps/accounts/tests/test_login_otp_v2.py::TestOtpProvider -v
```

Expected: all `TestOtpProvider` tests `PASSED`

- [ ] **Step 5: Commit**

```bash
git add apps/accounts/otp/ apps/accounts/tests/test_login_otp_v2.py
git commit -m "feat: add BaseOtpSender, StubOtpSender, TwilioOtpSender, factory"
```

---

## Task 4: Update settings (`config/settings/base.py`)

**Files:**
- Modify: `backend/config/settings/base.py`

- [ ] **Step 1: Add new env var declarations**

In the `env = environ.Env(...)` block (around line 15), add five new entries after `OTP_EXPIRY_SECONDS`:

```python
    OTP_PROVIDER=(str, "stub"),
    DEFAULT_OTP_CHANNEL=(str, "sms"),
    OTP_ALLOWED_CHANNELS=(list, ["sms", "whatsapp"]),
    OTP_MAX_ATTEMPTS=(int, 5),
    OTP_RESEND_COOLDOWN_SECONDS=(int, 60),
```

- [ ] **Step 2: Add settings variables**

In the `# ─── OTP Settings ───` section (around line 332), after `OTP_REDIS_PREFIX`, add:

```python
OTP_PROVIDER               = env("OTP_PROVIDER")
DEFAULT_OTP_CHANNEL        = env("DEFAULT_OTP_CHANNEL")
OTP_ALLOWED_CHANNELS       = env("OTP_ALLOWED_CHANNELS")
OTP_MAX_ATTEMPTS           = env("OTP_MAX_ATTEMPTS")
OTP_RESEND_COOLDOWN_SECONDS = env("OTP_RESEND_COOLDOWN_SECONDS")
```

In the `# ─── SMS Settings ───` section, after `TWILIO_FROM_NUMBER`, add:

```python
TWILIO_WHATSAPP_NUMBER = env("TWILIO_WHATSAPP_NUMBER", default="")
```

- [ ] **Step 3: Verify settings load without error**

```bash
python -c "import django; import os; os.environ['DJANGO_SETTINGS_MODULE']='config.settings.local'; django.setup(); from django.conf import settings; print(settings.OTP_PROVIDER, settings.DEFAULT_OTP_CHANNEL, settings.OTP_MAX_ATTEMPTS)"
```

Expected output: `stub sms 5`

- [ ] **Step 4: Commit**

```bash
git add config/settings/base.py
git commit -m "feat: add OTP_PROVIDER, DEFAULT_OTP_CHANNEL, OTP_MAX_ATTEMPTS settings"
```

---

## Task 5: Add `request_login_otp` and `verify_login_otp` service functions

**Files:**
- Modify: `backend/apps/accounts/services.py`
- Test: `backend/apps/accounts/tests/test_login_otp_v2.py`

- [ ] **Step 1: Write failing service-level tests**

Add to `test_login_otp_v2.py`:

```python
@override_settings(**OTP_TEST_SETTINGS)
class TestRequestLoginOtpService(TestCase):
    def setUp(self):
        cache.clear()

    def test_unknown_phone_does_not_raise(self):
        from apps.accounts.services import request_login_otp
        # Must complete silently without exposing existence
        request_login_otp("+249912200099", "sms")

    def test_inactive_user_does_not_raise(self):
        from apps.accounts.services import request_login_otp
        make_user("+249912200001", is_active=False)
        request_login_otp("+249912200001", "sms")

    def test_valid_user_stores_hashed_otp_for_channel(self):
        from apps.accounts.services import request_login_otp
        from apps.core.utils import _otp_v2_key
        make_user("+249912200001")
        request_login_otp("+249912200001", "sms")
        self.assertIsNotNone(cache.get(_otp_v2_key("sms", "+249912200001")))

    def test_whatsapp_uses_whatsapp_key(self):
        from apps.accounts.services import request_login_otp
        from apps.core.utils import _otp_v2_key
        make_user("+249912200001")
        request_login_otp("+249912200001", "whatsapp")
        self.assertIsNotNone(cache.get(_otp_v2_key("whatsapp", "+249912200001")))
        self.assertIsNone(cache.get(_otp_v2_key("sms", "+249912200001")))

    def test_cooldown_raises(self):
        from apps.accounts.services import request_login_otp
        from apps.core.utils import set_channel_cooldown
        from apps.core.exceptions import OTPCooldownError
        make_user("+249912200001")
        set_channel_cooldown("+249912200001", "sms", seconds=60)
        with self.assertRaises(OTPCooldownError):
            request_login_otp("+249912200001", "sms")


@override_settings(**OTP_TEST_SETTINGS)
class TestVerifyLoginOtpService(TestCase):
    def setUp(self):
        cache.clear()

    def test_correct_otp_returns_tokens(self):
        from apps.accounts.services import verify_login_otp
        from apps.core.utils import store_otp_hashed
        make_user("+249912200001")
        store_otp_hashed("+249912200001", "123456", "sms")
        result = verify_login_otp("+249912200001", "123456", "sms")
        self.assertIn("access", result)
        self.assertIn("refresh", result)

    def test_wrong_otp_raises_invalid(self):
        from apps.accounts.services import verify_login_otp
        from apps.core.utils import store_otp_hashed
        from apps.core.exceptions import InvalidOTPError
        make_user("+249912200001")
        store_otp_hashed("+249912200001", "123456", "sms")
        with self.assertRaises(InvalidOTPError):
            verify_login_otp("+249912200001", "999999", "sms")

    def test_expired_otp_raises_expired(self):
        from apps.accounts.services import verify_login_otp
        from apps.core.exceptions import OTPExpiredError
        make_user("+249912200001")
        with self.assertRaises(OTPExpiredError):
            verify_login_otp("+249912200001", "123456", "sms")

    def test_max_attempts_raises_lockout(self):
        from apps.accounts.services import verify_login_otp
        from apps.core.utils import store_otp_hashed
        from apps.core.exceptions import OTPMaxAttemptsError, InvalidOTPError
        make_user("+249912200001")
        store_otp_hashed("+249912200001", "123456", "sms")
        # OTP_MAX_ATTEMPTS=3 in OTP_TEST_SETTINGS; first 2 raise InvalidOTPError
        for _ in range(2):
            with self.assertRaises(InvalidOTPError):
                verify_login_otp("+249912200001", "999999", "sms")
        # 3rd attempt hits the cap
        with self.assertRaises(OTPMaxAttemptsError):
            verify_login_otp("+249912200001", "999999", "sms")
```

- [ ] **Step 2: Run to confirm failures**

```bash
python -m pytest apps/accounts/tests/test_login_otp_v2.py::TestRequestLoginOtpService apps/accounts/tests/test_login_otp_v2.py::TestVerifyLoginOtpService -v
```

Expected: `ImportError` or `AttributeError` for `request_login_otp` / `verify_login_otp`

- [ ] **Step 3: Update imports at the top of `backend/apps/accounts/services.py`**

Replace the existing `from apps.core.exceptions import ...` line with:

```python
from apps.core.exceptions import (
    BusinessLogicError,
    InvalidOTPError,
    OTPCooldownError,
    OTPExpiredError,
    OTPMaxAttemptsError,
)
```

Replace the existing `from apps.core.utils import ...` block with:

```python
from apps.core.utils import (
    format_phone,
    generate_otp,
    get_channel_cooldown_remaining,
    get_otp_from_redis,
    increment_otp_attempts,
    mask_phone,
    reset_otp_attempts,
    send_sms_otp,
    set_channel_cooldown,
    set_otp_cooldown,
    store_otp_hashed,
    store_otp_in_redis,
    verify_and_consume_otp,
    verify_otp_from_redis,
)
```

- [ ] **Step 4: Add the two new service functions to `backend/apps/accounts/services.py`**

Append after `send_otp` (before `verify_otp`):

```python
def request_login_otp(phone: str, channel: str | None = None) -> None:
    """
    Issue a login OTP via the requested channel.

    Silently no-ops for non-existent or inactive users — never reveals
    whether a phone number is registered (prevents user enumeration).

    Raises:
        OTPCooldownError: Resend attempted within the cooldown window.
        BusinessLogicError: Channel not in OTP_ALLOWED_CHANNELS.
    """
    from django.conf import settings
    from apps.accounts.otp.factory import get_otp_sender

    phone = format_phone(phone)
    channel = channel or settings.DEFAULT_OTP_CHANNEL
    allowed = getattr(settings, "OTP_ALLOWED_CHANNELS", ["sms", "whatsapp"])

    if channel not in allowed:
        raise BusinessLogicError(f"Channel '{channel}' is not supported.", code="INVALID_CHANNEL")

    remaining = get_channel_cooldown_remaining(phone, channel)
    if remaining > 0:
        raise OTPCooldownError(retry_after=remaining)

    try:
        user = CustomUser.objects.get(phone=phone)
        if not user.is_active:
            logger.info("Login OTP skipped for inactive user %s", mask_phone(phone))
            return
    except CustomUser.DoesNotExist:
        logger.info("Login OTP skipped for unregistered phone %s", mask_phone(phone))
        return

    otp = generate_otp()
    store_otp_hashed(phone, otp, channel)
    set_channel_cooldown(phone, channel)
    reset_otp_attempts(phone, channel)

    sender = get_otp_sender()
    try:
        sender.send(phone, otp, channel)
    except Exception:
        logger.exception("OTP delivery failed: channel=%s phone=%s", channel, mask_phone(phone))


def verify_login_otp(phone: str, otp: str, channel: str | None = None) -> dict:
    """
    Verify a login OTP and return JWT tokens on success.

    Returns:
        dict with 'access', 'refresh', and 'user' keys.

    Raises:
        OTPExpiredError: OTP not found (expired or never issued).
        InvalidOTPError: Wrong OTP (below max-attempts threshold).
        OTPMaxAttemptsError: Too many wrong attempts — issue a new OTP.
        BusinessLogicError: User not found or account deactivated.
    """
    from django.conf import settings

    phone = format_phone(phone)
    channel = channel or settings.DEFAULT_OTP_CHANNEL
    max_attempts = getattr(settings, "OTP_MAX_ATTEMPTS", 5)

    result = verify_and_consume_otp(phone, otp, channel)

    if result == "expired":
        raise OTPExpiredError()

    if result == "invalid":
        attempts = increment_otp_attempts(phone, channel)
        if attempts >= max_attempts:
            raise OTPMaxAttemptsError()
        raise InvalidOTPError()

    # result == "ok"
    reset_otp_attempts(phone, channel)

    try:
        user = CustomUser.objects.get(phone=phone)
    except CustomUser.DoesNotExist:
        raise BusinessLogicError("No account found for this phone number.")

    if not user.is_active:
        raise BusinessLogicError("This account has been deactivated.")

    user.is_verified = True
    user.last_login_at = timezone.now()
    user.save(update_fields=["is_verified", "last_login_at"])

    tokens = get_tokens_for_user(user)
    tokens["user"] = user
    logger.info("User logged in via OTP: channel=%s phone=%s", channel, mask_phone(phone))
    return tokens
```

- [ ] **Step 5: Run to confirm pass**

```bash
python -m pytest apps/accounts/tests/test_login_otp_v2.py::TestRequestLoginOtpService apps/accounts/tests/test_login_otp_v2.py::TestVerifyLoginOtpService -v
```

Expected: all passing

- [ ] **Step 6: Commit**

```bash
git add apps/accounts/services.py apps/accounts/tests/test_login_otp_v2.py
git commit -m "feat: add request_login_otp and verify_login_otp service functions"
```

---

## Task 6: Add `channel` field to login serializers

**Files:**
- Modify: `backend/apps/accounts/serializers.py`
- Test: `backend/apps/accounts/tests/test_login_otp_v2.py`

- [ ] **Step 1: Write the failing test**

Add to `test_login_otp_v2.py`:

```python
class TestLoginSerializers(TestCase):
    def test_login_otp_serializer_accepts_channel(self):
        from apps.accounts.serializers import LoginOTPSerializer
        s = LoginOTPSerializer(data={"phone": "+249912200001", "channel": "whatsapp"})
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["channel"], "whatsapp")

    def test_login_otp_serializer_defaults_no_channel(self):
        from apps.accounts.serializers import LoginOTPSerializer
        s = LoginOTPSerializer(data={"phone": "+249912200001"})
        self.assertTrue(s.is_valid(), s.errors)
        self.assertNotIn("channel", s.validated_data)

    def test_login_otp_serializer_rejects_invalid_channel(self):
        from apps.accounts.serializers import LoginOTPSerializer
        s = LoginOTPSerializer(data={"phone": "+249912200001", "channel": "telegram"})
        self.assertFalse(s.is_valid())
        self.assertIn("channel", s.errors)

    def test_login_otp_verify_serializer_accepts_channel(self):
        from apps.accounts.serializers import LoginOTPVerifySerializer
        s = LoginOTPVerifySerializer(data={
            "phone": "+249912200001", "otp": "123456", "channel": "whatsapp",
        })
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["channel"], "whatsapp")
```

- [ ] **Step 2: Run to confirm failure**

```bash
python -m pytest apps/accounts/tests/test_login_otp_v2.py::TestLoginSerializers -v
```

Expected: failures because `channel` field doesn't exist yet

- [ ] **Step 3: Update `backend/apps/accounts/serializers.py`**

Replace `LoginOTPSerializer`:

```python
_OTP_CHANNEL_CHOICES = ["sms", "whatsapp"]


class LoginOTPSerializer(serializers.Serializer):
    """Serializer for initiating OTP-based login."""
    phone   = serializers.CharField(max_length=20)
    channel = serializers.ChoiceField(choices=_OTP_CHANNEL_CHOICES, required=False)

    def validate_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return format_phone(value)
```

In `LoginOTPVerifySerializer`, add `channel` field after `otp`:

```python
    otp      = serializers.CharField(min_length=4, max_length=8)
    channel  = serializers.ChoiceField(choices=_OTP_CHANNEL_CHOICES, required=False)
    fcm_token   = serializers.CharField(...)
    # ... rest unchanged
```

- [ ] **Step 4: Run to confirm pass**

```bash
python -m pytest apps/accounts/tests/test_login_otp_v2.py::TestLoginSerializers -v
```

Expected: all passing

- [ ] **Step 5: Commit**

```bash
git add apps/accounts/serializers.py apps/accounts/tests/test_login_otp_v2.py
git commit -m "feat: add channel field to LoginOTPSerializer and LoginOTPVerifySerializer"
```

---

## Task 7: Update views to use new service functions

**Files:**
- Modify: `backend/apps/accounts/views.py`

- [ ] **Step 1: Update imports at the top of `views.py`**

Find the existing service imports block and add:

```python
from .services import (
    ...
    request_login_otp,
    verify_login_otp,
    ...
)
```

Check the current imports — they include `send_otp` and `login_with_otp`. Add `request_login_otp` and `verify_login_otp` alongside them (old functions will remain for now; they're still used by registration flow).

- [ ] **Step 2: Replace `LoginOTPRequestView.post`**

Replace the entire `post` method body of `LoginOTPRequestView`:

```python
    def post(self, request):
        serializer = LoginOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone   = serializer.validated_data["phone"]
        channel = serializer.validated_data.get("channel")

        request_login_otp(phone=phone, channel=channel)

        return Response({
            "success": True,
            "message": "If this phone number is registered, an OTP will be sent.",
        })
```

- [ ] **Step 3: Replace `LoginOTPVerifyView.post` service call**

Replace the `is_first_login` capture and `login_with_otp` call:

```python
    def post(self, request):
        serializer = LoginOTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        is_first_login = not CustomUser.objects.filter(
            phone=data["phone"],
            last_login_at__isnull=False,
        ).exists()

        result = verify_login_otp(
            phone=data["phone"],
            otp=data["otp"],
            channel=data.get("channel"),
        )
        user = result.pop("user")

        # ── FCM token registration ────────────────────────────────────────────
        # (keep existing block unchanged, lines 181-204 of original file)

        # ── Login notifications ───────────────────────────────────────────────
        # (keep existing block unchanged, lines 206-228 of original file)

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": {
                    **result,
                    "user": UserProfileSerializer(user).data,
                },
            }
        )
```

The FCM token registration and notification blocks are unchanged — just swap the service call and add the `channel` argument.

- [ ] **Step 4: Verify server starts without error**

```bash
python manage.py check --deploy 2>&1 | grep -E "ERROR|Warning" || echo "OK"
```

- [ ] **Step 5: Commit**

```bash
git add apps/accounts/views.py
git commit -m "feat: wire LoginOTPRequestView and LoginOTPVerifyView to new OTP service"
```

---

## Task 8: Full integration tests (12 HTTP scenarios)

**Files:**
- Modify: `backend/apps/accounts/tests/test_login_otp_v2.py`

- [ ] **Step 1: Append the 12 HTTP integration tests to `test_login_otp_v2.py`**

```python
@override_settings(**OTP_TEST_SETTINGS)
class TestLoginOtpRequestEndpoint(TestCase):
    """POST /api-public/v1/auth/login/otp/"""

    def setUp(self):
        self.client = APIClient()
        cache.clear()

    # 1. User enumeration — unknown phone
    def test_unknown_phone_returns_generic_success(self):
        resp = self.client.post(REQUEST_URL, {"phone": "+249912299999"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["success"])
        self.assertIn("registered", resp.data["message"].lower())

    # 2. User enumeration — inactive user
    def test_inactive_user_returns_generic_success(self):
        make_user("+249912200001", is_active=False)
        resp = self.client.post(REQUEST_URL, {"phone": "+249912200001"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["success"])

    # 3. Valid user, default channel (sms)
    def test_valid_user_returns_success_and_stores_otp(self):
        from apps.core.utils import _otp_v2_key
        make_user("+249912200001")
        resp = self.client.post(REQUEST_URL, {"phone": "+249912200001"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(cache.get(_otp_v2_key("sms", "+249912200001")))

    # 4. Valid user, whatsapp channel
    def test_whatsapp_channel_uses_whatsapp_key(self):
        from apps.core.utils import _otp_v2_key
        make_user("+249912200001")
        resp = self.client.post(
            REQUEST_URL, {"phone": "+249912200001", "channel": "whatsapp"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(cache.get(_otp_v2_key("whatsapp", "+249912200001")))
        self.assertIsNone(cache.get(_otp_v2_key("sms", "+249912200001")))

    # 5. Cooldown active
    def test_cooldown_returns_429(self):
        from apps.core.utils import set_channel_cooldown
        make_user("+249912200001")
        set_channel_cooldown("+249912200001", "sms", seconds=60)
        resp = self.client.post(REQUEST_URL, {"phone": "+249912200001"}, format="json")
        self.assertEqual(resp.status_code, 429)
        self.assertEqual(resp.data["error"]["code"], "OTP_COOLDOWN")

    # 12. OTP value not in response body
    def test_otp_not_returned_in_response_body(self):
        make_user("+249912200001")
        resp = self.client.post(REQUEST_URL, {"phone": "+249912200001"}, format="json")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertNotIn("otp", body)
        self.assertNotIn("code", body)
        self.assertEqual(sorted(body.keys()), sorted(["success", "message"]))


@override_settings(**OTP_TEST_SETTINGS)
class TestLoginOtpVerifyEndpoint(TestCase):
    """POST /api-public/v1/auth/login/otp/verify/"""

    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def _store(self, phone, otp, channel="sms"):
        from apps.core.utils import store_otp_hashed
        store_otp_hashed(phone, otp, channel)

    # 6. Correct OTP → tokens
    def test_correct_otp_returns_access_refresh(self):
        make_user("+249912200001")
        self._store("+249912200001", "123456")
        resp = self.client.post(
            VERIFY_URL, {"phone": "+249912200001", "otp": "123456"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data["data"])
        self.assertIn("refresh", resp.data["data"])

    # 7. Wrong OTP → INVALID_OTP
    def test_wrong_otp_returns_400_invalid(self):
        make_user("+249912200001")
        self._store("+249912200001", "123456")
        resp = self.client.post(
            VERIFY_URL, {"phone": "+249912200001", "otp": "999999"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["error"]["code"], "INVALID_OTP")

    # 8. Expired OTP (no Redis entry) → OTP_EXPIRED
    def test_expired_otp_returns_400_expired(self):
        make_user("+249912200001")
        resp = self.client.post(
            VERIFY_URL, {"phone": "+249912200001", "otp": "123456"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["error"]["code"], "OTP_EXPIRED")

    # 9. OTP reuse → OTP_EXPIRED
    def test_otp_reuse_returns_400_expired(self):
        make_user("+249912200001")
        self._store("+249912200001", "123456")
        # First use — succeeds
        self.client.post(
            VERIFY_URL, {"phone": "+249912200001", "otp": "123456"}, format="json"
        )
        # Second use — OTP deleted
        resp = self.client.post(
            VERIFY_URL, {"phone": "+249912200001", "otp": "123456"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["error"]["code"], "OTP_EXPIRED")

    # 10. Max attempts lockout (OTP_MAX_ATTEMPTS=3)
    def test_max_attempts_returns_429(self):
        make_user("+249912200001")
        self._store("+249912200001", "123456")
        for _ in range(2):
            self.client.post(
                VERIFY_URL, {"phone": "+249912200001", "otp": "999999"}, format="json"
            )
        resp = self.client.post(
            VERIFY_URL, {"phone": "+249912200001", "otp": "999999"}, format="json"
        )
        self.assertEqual(resp.status_code, 429)
        self.assertEqual(resp.data["error"]["code"], "OTP_MAX_ATTEMPTS")

    # 11. Channel mismatch (stored for sms, verify with whatsapp)
    def test_channel_mismatch_returns_400_expired(self):
        make_user("+249912200001")
        self._store("+249912200001", "123456", channel="sms")
        resp = self.client.post(
            VERIFY_URL,
            {"phone": "+249912200001", "otp": "123456", "channel": "whatsapp"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["error"]["code"], "OTP_EXPIRED")
```

- [ ] **Step 2: Run all tests in the file**

```bash
python -m pytest apps/accounts/tests/test_login_otp_v2.py -v
```

Expected: all tests pass. If any fail, fix the root cause before committing.

- [ ] **Step 3: Run the full test suite to catch regressions**

```bash
python -m pytest --tb=short -q
```

Expected: no new failures

- [ ] **Step 4: Commit**

```bash
git add apps/accounts/tests/test_login_otp_v2.py
git commit -m "test: add 12 WhatsApp/SMS OTP login integration tests"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `channel` field on both request/verify endpoints (Tasks 6, 7)
- [x] Backward compatible — `channel` is optional, defaults to `DEFAULT_OTP_CHANNEL` (Task 7)
- [x] Generic success response prevents phone enumeration (Tasks 5, 7)
- [x] Never create user during login OTP flow — `request_login_otp` no-ops, `verify_login_otp` uses `.get()` not `.get_or_create()` (Task 5)
- [x] HMAC-SHA256 before Redis storage (Task 2)
- [x] Per-channel Redis keys `otp_v2:{channel}:{phone}` (Task 2)
- [x] `OTPMaxAttemptsError` with 429 status (Task 1)
- [x] Provider abstraction: stub, twilio, factory (Task 3)
- [x] Twilio WhatsApp: `from_=whatsapp:{number}`, `to=whatsapp:{phone}` (Task 3)
- [x] New settings: `OTP_PROVIDER`, `DEFAULT_OTP_CHANNEL`, `OTP_ALLOWED_CHANNELS`, `OTP_MAX_ATTEMPTS`, `OTP_RESEND_COOLDOWN_SECONDS`, `TWILIO_WHATSAPP_NUMBER` (Task 4)
- [x] OTP never logged (StubOtpSender logs `[REDACTED]`) (Task 3)
- [x] All 12 required test scenarios covered (Task 8)

**No placeholders**: all code blocks are complete and runnable.

**Type consistency**: `verify_and_consume_otp` returns `str` (`"ok"` | `"expired"` | `"invalid"`) everywhere it is called.
