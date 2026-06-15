"""
OTP delivery providers for AmanaPOS.

Select provider via OTP_PROVIDER setting:
    stub              — logs only, no network call (default/dev)
    twilio_messaging  — Twilio Programmable Messaging API (WhatsApp)
"""
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from django.conf import settings

from apps.core.utils import mask_phone

logger = logging.getLogger(__name__)


@dataclass
class OtpSendResult:
    success: bool
    error: str | None = field(default=None)


class BaseOtpSender(ABC):
    @abstractmethod
    def send_otp(self, phone: str, otp: str, channel: str) -> OtpSendResult:
        """Deliver OTP to phone via channel."""


class StubOtpSender(BaseOtpSender):
    """No-op sender for development and testing. Logs without revealing the OTP."""

    def send_otp(self, phone: str, otp: str, channel: str) -> OtpSendResult:
        logger.info("[OTP STUB] channel=%s to=%s — delivery skipped", channel, mask_phone(phone))
        return OtpSendResult(success=True)


class TwilioMessagingOtpSender(BaseOtpSender):
    """
    Delivers OTP via Twilio WhatsApp using a plain-text message.
    Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
    """

    def send_otp(self, phone: str, otp: str, channel: str) -> OtpSendResult:
        try:
            from twilio.rest import Client
        except ImportError:
            logger.error("twilio package not installed")
            return OtpSendResult(success=False, error="twilio package missing")

        account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
        auth_token  = getattr(settings, "TWILIO_AUTH_TOKEN", "")
        whatsapp_from = getattr(settings, "TWILIO_WHATSAPP_FROM", "")

        if not all([account_sid, auth_token]):
            logger.error("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured")
            return OtpSendResult(success=False, error="Twilio credentials not configured")

        if not whatsapp_from:
            logger.error("TWILIO_WHATSAPP_FROM not configured")
            return OtpSendResult(success=False, error="TWILIO_WHATSAPP_FROM not configured")

        minutes = settings.OTP_EXPIRY_SECONDS // 60
        body = (
            f"Your AmanaPOS verification code is {otp}. "
            f"This code expires in {minutes} minutes."
        )

        try:
            client = Client(account_sid, auth_token)
            client.messages.create(
                body=body,
                from_=whatsapp_from,
                to=f"whatsapp:{phone}",
            )
            logger.info("OTP delivered via Twilio/WhatsApp to %s", mask_phone(phone))
            return OtpSendResult(success=True)

        except Exception as exc:
            logger.exception(
                "Twilio OTP delivery failed: phone=%s error=%s",
                mask_phone(phone), exc,
            )
            return OtpSendResult(success=False, error=str(exc))


def get_otp_sender() -> BaseOtpSender:
    """Return the configured OTP sender instance."""
    provider = getattr(settings, "OTP_PROVIDER", "stub")
    if provider == "twilio_messaging":
        return TwilioMessagingOtpSender()
    return StubOtpSender()
