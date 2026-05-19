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
