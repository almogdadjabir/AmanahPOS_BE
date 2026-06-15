"""
OTP delivery providers for AmanaPOS.

Select provider via OTP_PROVIDER setting:
    stub              — logs only, no network call (default/dev)
    twilio_messaging  — Twilio Programmable Messaging API (SMS + WhatsApp)
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
        """Deliver OTP to phone via channel ('sms' or 'whatsapp')."""


class StubOtpSender(BaseOtpSender):
    """No-op sender for development and testing. Logs without revealing the OTP."""

    def send_otp(self, phone: str, otp: str, channel: str) -> OtpSendResult:
        logger.info("[OTP STUB] channel=%s to=%s — delivery skipped", channel, mask_phone(phone))
        return OtpSendResult(success=True)


class TwilioMessagingOtpSender(BaseOtpSender):
    """
    Delivers OTP via Twilio Programmable Messaging.

    WhatsApp: uses TWILIO_MESSAGING_SERVICE_SID + TWILIO_WHATSAPP_OTP_CONTENT_SID
              (approved WhatsApp authentication template; variable {{1}} = OTP code)
    SMS:      uses TWILIO_SMS_FROM with a plain-text body
    """

    def send_otp(self, phone: str, otp: str, channel: str) -> OtpSendResult:
        import json

        try:
            from twilio.rest import Client
        except ImportError:
            logger.error("twilio package not installed — add twilio>=9.0.0 to requirements")
            return OtpSendResult(success=False, error="twilio package missing")

        account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
        auth_token  = getattr(settings, "TWILIO_AUTH_TOKEN", "")

        if not all([account_sid, auth_token]):
            logger.error("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured")
            return OtpSendResult(success=False, error="Twilio credentials not configured")

        try:
            client = Client(account_sid, auth_token)

            if channel == "whatsapp":
                content_sid = getattr(settings, "TWILIO_WHATSAPP_OTP_CONTENT_SID", "")
                if content_sid:
                    # Use approved WhatsApp authentication template when available
                    messaging_service_sid = getattr(settings, "TWILIO_MESSAGING_SERVICE_SID", "")
                    if not messaging_service_sid:
                        return OtpSendResult(success=False, error="TWILIO_MESSAGING_SERVICE_SID not configured")
                    client.messages.create(
                        messaging_service_sid=messaging_service_sid,
                        content_sid=content_sid,
                        content_variables=json.dumps({"1": otp}),
                        to=f"whatsapp:{phone}",
                    )
                else:
                    # Fallback: plain-text WhatsApp message (no template required)
                    whatsapp_from = getattr(settings, "TWILIO_WHATSAPP_FROM", "")
                    if not whatsapp_from:
                        return OtpSendResult(success=False, error="TWILIO_WHATSAPP_FROM not configured")
                    minutes = settings.OTP_EXPIRY_SECONDS // 60
                    body = (
                        f"Your AmanaPOS verification code is {otp}. "
                        f"This code expires in {minutes} minutes."
                    )
                    client.messages.create(
                        body=body,
                        from_=whatsapp_from,
                        to=f"whatsapp:{phone}",
                    )
            else:
                from_number = getattr(settings, "TWILIO_SMS_FROM", "")
                if not from_number:
                    return OtpSendResult(success=False, error="TWILIO_SMS_FROM not configured")
                minutes = settings.OTP_EXPIRY_SECONDS // 60
                body = (
                    f"Your AmanaPOS verification code is {otp}. "
                    f"This code expires in {minutes} minutes."
                )
                client.messages.create(
                    body=body,
                    from_=from_number,
                    to=phone,
                )

            logger.info("OTP delivered via Twilio/%s to %s", channel, mask_phone(phone))
            return OtpSendResult(success=True)

        except Exception as exc:
            logger.exception(
                "Twilio OTP delivery failed: channel=%s phone=%s error=%s",
                channel, mask_phone(phone), exc,
            )
            return OtpSendResult(success=False, error=str(exc))


def get_otp_sender() -> BaseOtpSender:
    """Return the configured OTP sender instance."""
    provider = getattr(settings, "OTP_PROVIDER", "stub")
    if provider == "twilio_messaging":
        return TwilioMessagingOtpSender()
    return StubOtpSender()
