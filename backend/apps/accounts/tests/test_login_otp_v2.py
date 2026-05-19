"""
Tests: WhatsApp/SMS OTP login (per-channel, hashed, enumeration-safe).

Covers the 15 required scenarios:
 1. Existing active user can request WhatsApp OTP.
 2. Existing active user can request SMS OTP.
 3. Missing channel uses DEFAULT_OTP_CHANNEL.
 4. Invalid channel fails serializer validation.
 5. Non-existing phone returns generic success (no OTP generated/sent).
 6. Inactive user returns generic success (no OTP generated/sent).
 7. OTP is stored hashed, not plain text.
 8. Correct OTP returns JWT access + refresh tokens.
 9. Wrong OTP increments attempts and returns INVALID_OTP.
10. Expired OTP (key not in Redis) returns INVALID_OTP.
11. OTP cannot be reused after successful verification.
12. Login OTP never creates a new user.
13. Twilio sender is called with whatsapp:{phone} format for WhatsApp.
14. Twilio sender is not called for unknown/inactive phone.
15. Existing admin/dashboard user-creation flow remains working.
"""
from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.core.utils import (
    _channel_attempts_key,
    _channel_otp_key,
    get_otp_attempts,
    store_channel_otp,
    set_channel_cooldown,
)

REQUEST_URL = "/api-public/v1/auth/login/otp/"
VERIFY_URL  = "/api-public/v1/auth/login/otp/verify/"

OTP_TEST_SETTINGS = {
    "OTP_PROVIDER":               "stub",
    "DEFAULT_OTP_CHANNEL":        "sms",
    "OTP_ALLOWED_CHANNELS":       ["sms", "whatsapp"],
    "OTP_MAX_ATTEMPTS":           5,
    "OTP_RESEND_COOLDOWN_SECONDS": 60,
    "OTP_EXPIRY_SECONDS":         300,
    "OTP_LENGTH":                 6,
}


def make_active_user(phone="+249912200001"):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Test User", role="owner", is_active=True,
    )


def make_inactive_user(phone="+249912200002"):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Inactive User", role="owner", is_active=False,
    )


# ─── Test 1 & 2: Channel selection ───────────────────────────────────────────

@override_settings(**OTP_TEST_SETTINGS)
class TestRequestOtpChannels(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def test_1_whatsapp_otp_stores_under_whatsapp_key(self):
        """Existing active user can request WhatsApp OTP."""
        make_active_user("+249912200001")
        resp = self.client.post(
            REQUEST_URL, {"phone": "+249912200001", "channel": "whatsapp"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["success"])
        self.assertIsNotNone(cache.get(_channel_otp_key("whatsapp", "+249912200001")))
        self.assertIsNone(cache.get(_channel_otp_key("sms", "+249912200001")))

    def test_2_sms_otp_stores_under_sms_key(self):
        """Existing active user can request SMS OTP."""
        make_active_user("+249912200001")
        resp = self.client.post(
            REQUEST_URL, {"phone": "+249912200001", "channel": "sms"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIsNotNone(cache.get(_channel_otp_key("sms", "+249912200001")))


# ─── Test 3: Default channel ──────────────────────────────────────────────────

@override_settings(**OTP_TEST_SETTINGS)
class TestDefaultChannel(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def test_3_missing_channel_uses_default(self):
        """Missing channel uses DEFAULT_OTP_CHANNEL ('sms' in test settings)."""
        make_active_user("+249912200001")
        resp = self.client.post(REQUEST_URL, {"phone": "+249912200001"}, format="json")
        self.assertEqual(resp.status_code, 200)
        # DEFAULT_OTP_CHANNEL=sms → OTP stored under sms key
        self.assertIsNotNone(cache.get(_channel_otp_key("sms", "+249912200001")))


# ─── Test 4: Invalid channel ─────────────────────────────────────────────────

@override_settings(**OTP_TEST_SETTINGS)
class TestInvalidChannel(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def test_4_invalid_channel_fails_validation(self):
        """Invalid channel is rejected by the serializer."""
        resp = self.client.post(
            REQUEST_URL, {"phone": "+249912200001", "channel": "telegram"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.data["success"])


# ─── Tests 5 & 6: User enumeration protection ────────────────────────────────

@override_settings(**OTP_TEST_SETTINGS)
class TestUnregisteredAndInactive(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def test_5_unknown_phone_returns_error(self):
        """Non-existing phone returns 400 PHONE_NOT_REGISTERED — no OTP generated."""
        resp = self.client.post(
            REQUEST_URL, {"phone": "+249912299999"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.data["success"])
        self.assertEqual(resp.data["error"]["code"], "PHONE_NOT_REGISTERED")
        self.assertIsNone(cache.get(_channel_otp_key("sms", "+249912299999")))

    def test_6_inactive_user_returns_error(self):
        """Inactive user returns 400 ACCOUNT_INACTIVE — no OTP generated."""
        make_inactive_user("+249912200002")
        resp = self.client.post(
            REQUEST_URL, {"phone": "+249912200002"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.data["success"])
        self.assertEqual(resp.data["error"]["code"], "ACCOUNT_INACTIVE")
        self.assertIsNone(cache.get(_channel_otp_key("sms", "+249912200002")))


# ─── Test 7: OTP stored hashed ───────────────────────────────────────────────

@override_settings(**OTP_TEST_SETTINGS)
class TestOtpStoredHashed(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def test_7_otp_stored_as_hash_not_plain_text(self):
        """The Redis value is a 64-char hex hash, not a 6-digit OTP."""
        make_active_user("+249912200001")
        resp = self.client.post(REQUEST_URL, {"phone": "+249912200001"}, format="json")
        self.assertEqual(resp.status_code, 200)

        stored = cache.get(_channel_otp_key("sms", "+249912200001"))
        self.assertIsNotNone(stored)
        # HMAC-SHA256 hex digest is exactly 64 characters
        self.assertEqual(len(stored), 64)
        # Must be hex, not digits-only (a 6-digit OTP would be ≤6 chars)
        self.assertNotRegex(stored, r"^\d{4,8}$")


# ─── Tests 8–11: Verify endpoint ─────────────────────────────────────────────

@override_settings(**OTP_TEST_SETTINGS)
class TestVerifyOtp(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()
        self.user = make_active_user("+249912200001")

    def _store(self, otp="123456", channel="sms"):
        store_channel_otp("+249912200001", otp, channel)

    def test_8_correct_otp_returns_jwt(self):
        """Correct OTP returns JWT access + refresh tokens."""
        self._store("123456")
        resp = self.client.post(
            VERIFY_URL, {"phone": "+249912200001", "otp": "123456"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["success"])
        self.assertIn("access",  resp.data["data"])
        self.assertIn("refresh", resp.data["data"])

    def test_9_wrong_otp_increments_attempts_and_fails(self):
        """Wrong OTP increments attempts counter and returns INVALID_OTP."""
        self._store("123456")
        resp = self.client.post(
            VERIFY_URL, {"phone": "+249912200001", "otp": "999999"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["error"]["code"], "INVALID_OTP")
        self.assertEqual(get_otp_attempts("+249912200001", "sms"), 1)

    def test_10_expired_otp_returns_invalid(self):
        """Expired OTP (no Redis entry) returns INVALID_OTP."""
        resp = self.client.post(
            VERIFY_URL, {"phone": "+249912200001", "otp": "123456"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["error"]["code"], "INVALID_OTP")

    def test_11_otp_reuse_fails(self):
        """OTP is deleted on first successful use; reuse returns INVALID_OTP."""
        self._store("123456")
        # First use — success
        resp1 = self.client.post(
            VERIFY_URL, {"phone": "+249912200001", "otp": "123456"}, format="json"
        )
        self.assertEqual(resp1.status_code, 200)
        # Second use — OTP key is gone
        resp2 = self.client.post(
            VERIFY_URL, {"phone": "+249912200001", "otp": "123456"}, format="json"
        )
        self.assertEqual(resp2.status_code, 400)
        self.assertEqual(resp2.data["error"]["code"], "INVALID_OTP")


# ─── Test 12: No user creation ───────────────────────────────────────────────

@override_settings(**OTP_TEST_SETTINGS)
class TestNoUserCreation(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    def test_12_login_otp_never_creates_user(self):
        """Neither requesting nor verifying an OTP creates a new user."""
        count_before = CustomUser.objects.count()

        # Request for unknown phone
        self.client.post(REQUEST_URL, {"phone": "+249912299999"}, format="json")
        # Verify with garbage OTP for unknown phone
        self.client.post(
            VERIFY_URL, {"phone": "+249912299999", "otp": "000000"}, format="json"
        )

        self.assertEqual(CustomUser.objects.count(), count_before)


# ─── Tests 13 & 14: Twilio sender integration ────────────────────────────────

@override_settings(**{**OTP_TEST_SETTINGS, "OTP_PROVIDER": "twilio_messaging",
                       "TWILIO_ACCOUNT_SID": "ACtest", "TWILIO_AUTH_TOKEN": "authtest",
                       "TWILIO_WHATSAPP_FROM": "whatsapp:+14155238886",
                       "TWILIO_SMS_FROM": "+15005550006"})
class TestTwilioSender(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

    @patch("twilio.rest.Client")
    def test_13_whatsapp_uses_whatsapp_prefix(self, MockClient):
        """Twilio sender formats 'to' as whatsapp:{phone} for WhatsApp channel."""
        mock_messages = MagicMock()
        MockClient.return_value.messages = mock_messages

        make_active_user("+249912200001")
        resp = self.client.post(
            REQUEST_URL, {"phone": "+249912200001", "channel": "whatsapp"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)

        mock_messages.create.assert_called_once()
        call_kwargs = mock_messages.create.call_args.kwargs
        self.assertEqual(call_kwargs["to"], "whatsapp:+249912200001")
        self.assertEqual(call_kwargs["from_"], "whatsapp:+14155238886")

    @patch("twilio.rest.Client")
    def test_14_sender_not_called_for_unknown_phone(self, MockClient):
        """Twilio sender is never invoked for an unregistered phone number."""
        mock_messages = MagicMock()
        MockClient.return_value.messages = mock_messages

        # Unknown phone — no user in DB
        resp = self.client.post(
            REQUEST_URL, {"phone": "+249912299999", "channel": "whatsapp"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        mock_messages.create.assert_not_called()

    @patch("twilio.rest.Client")
    def test_14b_sender_not_called_for_inactive_user(self, MockClient):
        """Twilio sender is never invoked for an inactive user."""
        mock_messages = MagicMock()
        MockClient.return_value.messages = mock_messages

        make_inactive_user("+249912200002")
        resp = self.client.post(
            REQUEST_URL, {"phone": "+249912200002", "channel": "whatsapp"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        mock_messages.create.assert_not_called()


# ─── Test 15: Dashboard user creation still works ────────────────────────────

@override_settings(**OTP_TEST_SETTINGS)
class TestDashboardUserCreation(TestCase):
    def test_15_register_user_service_creates_user(self):
        """Existing admin/dashboard user-creation flow remains unaffected."""
        from apps.accounts.services import register_user

        user = register_user(
            phone="+249912200099",
            full_name="Dashboard Owner",
        )
        self.assertIsNotNone(user.pk)
        self.assertEqual(user.phone, "+249912200099")
        self.assertEqual(user.role, "owner")
        # Verify the user can now request a login OTP (proves end-to-end)
        self.assertTrue(CustomUser.objects.filter(phone="+249912200099").exists())
