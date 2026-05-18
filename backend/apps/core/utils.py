"""
Core utility functions for AmanaPOS.
"""
import hmac as _hmac
import logging
import re
import secrets
import string
from hashlib import sha256 as _sha256

from django.conf import settings
from django.core.cache import cache

import phonenumbers

logger = logging.getLogger(__name__)


# ─── OTP ──────────────────────────────────────────────────────────────────────

def generate_otp(length: int | None = None) -> str:
    """
    Generate a cryptographically secure numeric OTP.
    In DEBUG mode returns DEV_OTP_CODE if set (for local testing only).
    """
    if settings.DEBUG:
        dev_code = getattr(settings, "DEV_OTP_CODE", "")
        if dev_code:
            return dev_code
    length = length or getattr(settings, "OTP_LENGTH", 6)
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


def store_otp_in_redis(phone: str, otp: str, expiry_seconds: int | None = None) -> None:
    """
    Store OTP in Redis with a TTL. Key format: otp:{phone}
    """
    expiry = expiry_seconds or getattr(settings, "OTP_EXPIRY_SECONDS", 300)
    prefix = getattr(settings, "OTP_REDIS_PREFIX", "otp")
    key = f"{prefix}:{phone}"
    cache.set(key, otp, timeout=expiry)
    logger.debug("OTP stored in Redis for %s (expires in %ds)", phone, expiry)


def get_otp_from_redis(phone: str) -> str | None:
    """
    Retrieve the stored OTP for a phone number from Redis.
    Returns None if not found or expired.
    """
    prefix = getattr(settings, "OTP_REDIS_PREFIX", "otp")
    key = f"{prefix}:{phone}"
    return cache.get(key)


def delete_otp_from_redis(phone: str) -> None:
    """
    Delete the OTP for a phone number from Redis (after successful verification).
    """
    prefix = getattr(settings, "OTP_REDIS_PREFIX", "otp")
    key = f"{prefix}:{phone}"
    cache.delete(key)


def set_otp_cooldown(phone: str, seconds: int | None = None) -> None:
    """Mark that an OTP was just sent so rapid re-sends are blocked."""
    ttl = seconds or getattr(settings, "OTP_COOLDOWN_SECONDS", 60)
    cache.set(f"otp:cooldown:{phone}", 1, timeout=ttl)


def get_otp_cooldown_remaining(phone: str) -> int:
    """Return seconds remaining on the cooldown, 0 if no cooldown is active."""
    key = f"otp:cooldown:{phone}"
    if hasattr(cache, "ttl"):
        ttl = cache.ttl(key)
        return max(0, ttl) if ttl else 0
    return 0 if cache.get(key) is None else 60


def verify_otp_from_redis(phone: str, otp: str) -> bool:
    """
    Verify the OTP for a given phone number.
    Returns True if correct, False otherwise.
    Deletes OTP from Redis on successful verification.
    """
    stored_otp = get_otp_from_redis(phone)
    if stored_otp is None:
        logger.info("OTP verification failed for %s: OTP not found or expired", phone)
        return False
    if stored_otp != otp:
        logger.info("OTP verification failed for %s: incorrect OTP", phone)
        return False
    delete_otp_from_redis(phone)
    logger.info("OTP verified successfully for %s", phone)
    return True


# ─── Per-channel hashed OTP ──────────────────────────────────────────────────
#
# Redis key scheme:
#   OTP hash  : otp:{channel}:{phone}
#   Cooldown  : otp_cooldown:{channel}:{phone}
#   Attempts  : otp_attempts:{channel}:{phone}
#

def _channel_otp_key(channel: str, phone: str) -> str:
    return f"otp:{channel}:{phone}"


def _channel_cooldown_key(channel: str, phone: str) -> str:
    return f"otp_cooldown:{channel}:{phone}"


def _channel_attempts_key(channel: str, phone: str) -> str:
    return f"otp_attempts:{channel}:{phone}"


def _hash_otp(phone: str, otp: str) -> str:
    """HMAC-SHA256 of OTP, keyed by (SECRET_KEY + phone). Never store raw OTP."""
    key = (settings.SECRET_KEY + phone).encode()
    return _hmac.new(key, otp.encode(), _sha256).hexdigest()


def store_channel_otp(phone: str, otp: str, channel: str, expiry_seconds: int | None = None) -> None:
    """Store HMAC-hashed OTP under otp:{channel}:{phone}."""
    expiry = expiry_seconds or getattr(settings, "OTP_EXPIRY_SECONDS", 300)
    cache.set(_channel_otp_key(channel, phone), _hash_otp(phone, otp), timeout=expiry)
    logger.debug("Hashed OTP stored for channel=%s (expires=%ds)", channel, expiry)


def get_channel_otp_hash(phone: str, channel: str) -> str | None:
    """Return the stored OTP hash, or None if expired/not found."""
    return cache.get(_channel_otp_key(channel, phone))


def delete_channel_otp(phone: str, channel: str) -> None:
    """Delete the OTP from Redis (call after successful verification)."""
    cache.delete(_channel_otp_key(channel, phone))


def verify_channel_otp(phone: str, otp: str, channel: str) -> bool:
    """
    Compare submitted OTP against stored hash using constant-time comparison.
    Does NOT delete the key — the caller is responsible for cleanup.
    """
    stored = cache.get(_channel_otp_key(channel, phone))
    if stored is None:
        return False
    return _hmac.compare_digest(_hash_otp(phone, otp), stored)


def set_channel_cooldown(phone: str, channel: str, seconds: int | None = None) -> None:
    """Set a per-channel resend cooldown."""
    ttl = seconds or getattr(settings, "OTP_RESEND_COOLDOWN_SECONDS", 60)
    cache.set(_channel_cooldown_key(channel, phone), 1, timeout=ttl)


def get_channel_cooldown_remaining(phone: str, channel: str) -> int:
    """Return seconds remaining on the per-channel cooldown, 0 if none active."""
    key = _channel_cooldown_key(channel, phone)
    if hasattr(cache, "ttl"):
        ttl = cache.ttl(key)
        return max(0, ttl) if ttl else 0
    return 0 if cache.get(key) is None else 60


def get_otp_attempts(phone: str, channel: str) -> int:
    """Return current failed-attempt count for this phone/channel."""
    val = cache.get(_channel_attempts_key(channel, phone))
    return int(val) if val is not None else 0


def increment_otp_attempts(phone: str, channel: str) -> int:
    """Increment failed-attempt counter and return the new count."""
    key = _channel_attempts_key(channel, phone)
    try:
        return cache.incr(key)
    except ValueError:
        expiry = getattr(settings, "OTP_EXPIRY_SECONDS", 300)
        cache.set(key, 1, timeout=expiry)
        return 1


def reset_otp_attempts(phone: str, channel: str) -> None:
    """Clear the failed-attempt counter (on success or new OTP issuance)."""
    cache.delete(_channel_attempts_key(channel, phone))


# ─── Phone Numbers ────────────────────────────────────────────────────────────

def format_phone(phone: str, country: str = "AE") -> str:
    """
    Parse and format a phone number to E.164 international format.
    Defaults to UAE (+971) country code if none provided.

    Args:
        phone: Raw phone string, e.g. "0501234567" or "+971501234567"
        country: ISO 3166-1 alpha-2 country code for default region

    Returns:
        E.164 formatted phone string, e.g. "+971501234567"

    Raises:
        ValueError: If the number is invalid.
    """
    import re as _re
    # Strip duplicate country-code prefix (e.g. "+249+249..." → "+249...")
    phone = _re.sub(r'(\+\d{1,4})\1+', r'\1', phone.strip())
    try:
        parsed = phonenumbers.parse(phone, country)
        if not phonenumbers.is_possible_number(parsed):
            raise ValueError(f"Invalid phone number: {phone}")
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException as exc:
        raise ValueError(f"Could not parse phone number '{phone}': {exc}") from exc


def is_valid_phone(phone: str, country: str = "AE") -> bool:
    """Return True if the phone number is valid, False otherwise."""
    try:
        format_phone(phone, country)
        return True
    except ValueError:
        return False


# ─── SMS ──────────────────────────────────────────────────────────────────────

def send_sms_otp(phone: str, otp: str) -> bool:
    """
    Send an OTP via SMS to the given phone number.
    Dispatches to the configured SMS provider.

    Returns True on success, False on failure.
    """
    provider = getattr(settings, "SMS_PROVIDER", "stub")
    minutes = settings.OTP_EXPIRY_SECONDS // 60
    message = f"رمز التحقق الخاص بك في AmanaPOS هو {otp}. صالح لمدة {minutes} دقائق."

    if provider == "twilio":
        return _send_twilio_sms(phone, message)
    elif provider == "budgetsms":
        return _send_budgetsms(phone, message)
    elif provider == "stub":
        logger.info("[SMS STUB] To: %s | Message: %s", phone, message)
        return True
    else:
        logger.error("Unknown SMS provider: %s", provider)
        return False


def _send_twilio_sms(phone: str, message: str) -> bool:
    """Send SMS using Twilio."""
    try:
        from twilio.rest import Client
        account_sid = settings.TWILIO_ACCOUNT_SID
        auth_token = settings.TWILIO_AUTH_TOKEN
        from_number = settings.TWILIO_FROM_NUMBER

        if not all([account_sid, auth_token, from_number]):
            logger.error("Twilio credentials are not fully configured.")
            return False

        client = Client(account_sid, auth_token)
        msg = client.messages.create(body=message, from_=from_number, to=phone)
        logger.info("Twilio SMS sent: SID=%s to %s", msg.sid, phone)
        return True
    except Exception as exc:
        logger.exception("Failed to send Twilio SMS to %s: %s", phone, exc)
        return False


def _send_budgetsms(phone: str, message: str) -> bool:
    """Send SMS using BudgetSMS.net."""
    try:
        from apps.notifications.services.sms.budgetsms import BudgetSmsError, BudgetSmsProvider
        provider = BudgetSmsProvider()
        if not all([provider.username, provider.userid, provider.handle]):
            logger.error("BudgetSMS credentials are not fully configured.")
            return False
        provider.send(phone, message)
        return True
    except Exception as exc:
        logger.exception("Failed to send BudgetSMS to %s: %s", mask_phone(phone), exc)
        return False


# ─── Misc ─────────────────────────────────────────────────────────────────────

def generate_receipt_number(prefix: str = "REC") -> str:
    """
    Generate a unique receipt number with a prefix.
    Format: REC-YYYYMMDD-XXXXXXXX
    """
    from django.utils import timezone
    import uuid
    now = timezone.now()
    date_part = now.strftime("%Y%m%d")
    unique_part = uuid.uuid4().hex[:8].upper()
    return f"{prefix}-{date_part}-{unique_part}"


def mask_phone(phone: str) -> str:
    """
    Mask a phone number for display purposes.
    e.g. "+971501234567" → "+9715****567"
    """
    if len(phone) <= 6:
        return phone
    return phone[:4] + "****" + phone[-3:]
