"""Unit tests for the BudgetSMS provider."""
import io
from unittest.mock import MagicMock, patch

import pytest
from django.test import TestCase, override_settings

from apps.notifications.services.sms.budgetsms import (
    BudgetSmsError,
    BudgetSmsProvider,
    SmsSendResult,
)

BUDGETSMS_SETTINGS = {
    "BUDGETSMS_USERNAME": "testuser",
    "BUDGETSMS_USERID": "12345",
    "BUDGETSMS_HANDLE": "testhandle",
    "BUDGETSMS_SENDER_ID": "AmanaPOS",
}


def _make_response(body: str, status: int = 200):
    resp = MagicMock()
    resp.read.return_value = body.encode("utf-8")
    resp.__enter__ = lambda s: s
    resp.__exit__ = MagicMock(return_value=False)
    return resp


class TestPhoneNormalization(TestCase):
    def setUp(self):
        self.provider = BudgetSmsProvider()

    def test_strips_plus(self):
        assert self.provider._normalize_phone("+249912300001") == "249912300001"

    def test_strips_spaces_and_hyphens(self):
        assert self.provider._normalize_phone("+249 912-300-001") == "249912300001"

    def test_already_normalized(self):
        assert self.provider._normalize_phone("249912300001") == "249912300001"


@override_settings(**BUDGETSMS_SETTINGS)
class TestBudgetSmsProviderSend(TestCase):
    def setUp(self):
        self.provider = BudgetSmsProvider()

    @patch("urllib.request.urlopen")
    def test_success_returns_result(self, mock_urlopen):
        mock_urlopen.return_value = _make_response("OK 987654321")
        result = self.provider.send("+249912300001", "Test message")
        assert result.success is True
        assert result.message_id == "987654321"
        assert result.raw == "OK 987654321"

    @patch("urllib.request.urlopen")
    def test_success_ok_no_id(self, mock_urlopen):
        mock_urlopen.return_value = _make_response("OK")
        result = self.provider.send("+249912300001", "Test")
        assert result.success is True
        assert result.message_id == ""

    @patch("urllib.request.urlopen")
    def test_known_error_code_raises(self, mock_urlopen):
        mock_urlopen.return_value = _make_response("ERR 101 Authentication failed")
        with self.assertRaises(BudgetSmsError) as ctx:
            self.provider.send("+249912300001", "Test")
        assert ctx.exception.code == "101"
        assert "Authentication" in ctx.exception.detail

    @patch("urllib.request.urlopen")
    def test_insufficient_credits_raises(self, mock_urlopen):
        mock_urlopen.return_value = _make_response("ERR 104")
        with self.assertRaises(BudgetSmsError) as ctx:
            self.provider.send("+249912300001", "Test")
        assert ctx.exception.code == "104"
        assert "credits" in ctx.exception.detail

    @patch("urllib.request.urlopen")
    def test_unknown_error_raises(self, mock_urlopen):
        mock_urlopen.return_value = _make_response("UNEXPECTED RESPONSE")
        with self.assertRaises(BudgetSmsError) as ctx:
            self.provider.send("+249912300001", "Test")
        assert ctx.exception.code == "UNKNOWN"

    @patch("urllib.request.urlopen", side_effect=OSError("Connection refused"))
    def test_network_error_raises(self, mock_urlopen):
        with self.assertRaises(BudgetSmsError) as ctx:
            self.provider.send("+249912300001", "Test")
        assert ctx.exception.code == "NETWORK"

    @patch("urllib.request.urlopen")
    def test_correct_url_params_sent(self, mock_urlopen):
        mock_urlopen.return_value = _make_response("OK 111")
        self.provider.send("+249912300001", "Hello")
        call_url = mock_urlopen.call_args[0][0]
        assert "username=testuser" in call_url
        assert "userid=12345" in call_url
        assert "handle=testhandle" in call_url
        assert "to=249912300001" in call_url
        assert "249912300001" in call_url
        assert "%2B" not in call_url  # no + in the to param


@override_settings(**BUDGETSMS_SETTINGS, SMS_PROVIDER="budgetsms", OTP_EXPIRY_SECONDS=300)
class TestSendSmsOtpBudgetSms(TestCase):
    """Integration: send_sms_otp dispatches to BudgetSMS when SMS_PROVIDER=budgetsms."""

    @patch("urllib.request.urlopen")
    def test_dispatches_to_budgetsms(self, mock_urlopen):
        from apps.core.utils import send_sms_otp
        mock_urlopen.return_value = _make_response("OK 555")
        result = send_sms_otp("+249912300001", "654321")
        assert result is True
        assert mock_urlopen.called

    @patch("urllib.request.urlopen")
    def test_arabic_message_sent(self, mock_urlopen):
        from apps.core.utils import send_sms_otp
        mock_urlopen.return_value = _make_response("OK 555")
        send_sms_otp("+249912300001", "654321")
        call_url = mock_urlopen.call_args[0][0]
        assert "654321" in call_url
        assert "AmanaPOS" in call_url

    @patch("urllib.request.urlopen", side_effect=OSError("timeout"))
    def test_network_failure_returns_false(self, mock_urlopen):
        from apps.core.utils import send_sms_otp
        result = send_sms_otp("+249912300001", "654321")
        assert result is False

    @patch("urllib.request.urlopen")
    def test_api_error_returns_false(self, mock_urlopen):
        from apps.core.utils import send_sms_otp
        mock_urlopen.return_value = _make_response("ERR 104 Insufficient credits")
        result = send_sms_otp("+249912300001", "654321")
        assert result is False
