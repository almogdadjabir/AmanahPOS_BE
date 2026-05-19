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


# ─── Task 2: TEST_PHONE production guard ─────────────────────────────────────

class TestTestPhoneProductionGuard(TestCase):
    def test_test_phone_raises_when_debug_false(self):
        """ImproperlyConfigured raised when TEST_PHONE set and DEBUG=False."""
        from django.core.exceptions import ImproperlyConfigured
        from apps.accounts.apps import AccountsConfig

        with self.settings(DEBUG=False, TEST_PHONE="+249999999999"):
            with self.assertRaises(ImproperlyConfigured):
                AccountsConfig._check_test_phone_safety()

    def test_test_phone_allowed_when_debug_true(self):
        """TEST_PHONE is permitted in DEBUG mode (local dev only)."""
        from apps.accounts.apps import AccountsConfig

        with self.settings(DEBUG=True, TEST_PHONE="+249999999999"):
            AccountsConfig._check_test_phone_safety()  # must not raise

    def test_no_test_phone_is_always_fine(self):
        """TEST_PHONE unset is always safe regardless of DEBUG."""
        from apps.accounts.apps import AccountsConfig

        with self.settings(DEBUG=False, TEST_PHONE=""):
            AccountsConfig._check_test_phone_safety()  # must not raise


# ─── Task 3: Redis failure visibility ────────────────────────────────────────

from unittest.mock import patch as _patch

@override_settings(**OTP_SETTINGS)
class TestRedisFailureVisibility(TestCase):
    def setUp(self):
        self.client = APIClient()
        make_active_user("+249912200011")

    def test_otp_request_returns_503_when_redis_unavailable(self):
        """
        If Redis raises during OTP store, the endpoint must return 503
        (OTP_DELIVERY_FAILED) rather than silently 200 with a broken OTP.
        """
        with _patch("apps.core.utils.cache") as mock_cache:
            mock_cache.get.return_value = None  # cooldown/attempts checks return nothing
            mock_cache.ttl.return_value = None   # no cooldown TTL active
            mock_cache.set.side_effect = Exception("Redis connection refused")
            resp = self.client.post(
                "/api-public/v1/auth/login/otp/",
                {"phone": "+249912200011", "channel": "sms"},
                format="json",
            )
        self.assertEqual(resp.status_code, 503)
        self.assertFalse(resp.data["success"])
        self.assertEqual(resp.data["error"]["code"], "OTP_DELIVERY_FAILED")


# ─── Task 4: Brute-force protection ──────────────────────────────────────────

from django.core.cache import cache as _django_cache
from apps.core.utils import store_channel_otp, _channel_otp_key


@override_settings(**{**OTP_SETTINGS, "OTP_MAX_ATTEMPTS": 3})
class TestBruteForceProtection(TestCase):
    def setUp(self):
        self.client = APIClient()
        _django_cache.clear()
        self.user = make_active_user("+249912200012")

    def test_lockout_after_max_wrong_attempts(self):
        """After OTP_MAX_ATTEMPTS wrong guesses the OTP is deleted; even correct OTP fails."""
        store_channel_otp("+249912200012", "111111", "sms")

        for _ in range(3):
            self.client.post(
                "/api-public/v1/auth/login/otp/verify/",
                {"phone": "+249912200012", "otp": "999999", "channel": "sms"},
                format="json",
            )

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
        """Successful OTP verification resets the attempts counter to 0."""
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
        """OTP in Redis must be a 64-char HMAC-SHA256 hex hash, never raw digits."""
        store_channel_otp("+249912200012", "111111", "sms")
        stored = _django_cache.get(_channel_otp_key("sms", "+249912200012"))
        self.assertIsNotNone(stored)
        self.assertEqual(len(stored), 64)
        self.assertNotRegex(stored, r"^\d{4,8}$")
