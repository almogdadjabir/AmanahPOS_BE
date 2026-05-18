"""
Business logic for accounts: registration, OTP, login.
"""
import logging

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.exceptions import (
    BusinessLogicError,
    InvalidOTPError,
    OTPCooldownError,
    OTPDeliveryFailedError,
    OTPExpiredError,
    OTPMaxAttemptsError,
)
from apps.core.utils import (
    delete_channel_otp,
    format_phone,
    generate_otp,
    get_channel_cooldown_remaining,
    get_channel_otp_hash,
    get_otp_attempts,
    get_otp_from_redis,
    increment_otp_attempts,
    mask_phone,
    reset_otp_attempts,
    send_sms_otp,
    set_channel_cooldown,
    set_otp_cooldown,
    store_channel_otp,
    store_otp_in_redis,
    verify_channel_otp,
    verify_otp_from_redis,
)
from .models import BankakAccount, CustomUser

logger = logging.getLogger(__name__)


def get_tokens_for_user(user: CustomUser) -> dict:
    """Generate JWT access and refresh tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def register_user(
    phone: str,
    full_name: str,
    email: str | None = None,
    bankak_account_number: str | None = None,
) -> CustomUser:
    """
    Internal staff creates an owner account.
    The owner logs in separately via the OTP login flow.

    Raises:
        BusinessLogicError: Phone or email already in use.
    """
    phone = format_phone(phone)

    if CustomUser.objects.filter(phone=phone).exists():
        raise BusinessLogicError(
            "A user with this phone number already exists.",
            code="PHONE_ALREADY_REGISTERED",
        )

    if email and CustomUser.objects.filter(email__iexact=email).exists():
        raise BusinessLogicError(
            "A user with this email already exists.",
            code="EMAIL_ALREADY_REGISTERED",
        )

    user = CustomUser.objects.create_user(
        phone=phone,
        full_name=full_name,
        email=email or None,
        role="owner",
        is_verified=False,
    )

    if bankak_account_number:
        set_bankak_account(user, bankak_account_number.strip())

    logger.info("Owner account created by staff: %s (id=%s)", phone, user.id)
    return user


# ── Bankak Account helpers ────────────────────────────────────────────────────

def get_default_bankak_account(owner: CustomUser) -> "BankakAccount | None":
    """Return the owner's current default Bankak account, or None."""
    return BankakAccount.objects.filter(owner=owner, is_default=True, is_active=True).first()


def set_bankak_account(owner: CustomUser, account_number: str) -> BankakAccount:
    """
    Create or update the owner's default Bankak account.
    Marks all previous accounts as non-default (one default at a time).
    """
    BankakAccount.objects.filter(owner=owner, is_default=True).update(is_default=False)
    account, _ = BankakAccount.objects.update_or_create(
        owner=owner,
        defaults={
            "account_number": account_number,
            "is_default": True,
            "is_active": True,
        },
    )
    logger.info("Bankak account set for owner %s: %s", owner.phone, account_number)
    return account


def remove_bankak_account(owner: CustomUser) -> None:
    """Soft-deactivate the owner's default Bankak account."""
    BankakAccount.objects.filter(owner=owner, is_active=True).update(is_active=False, is_default=False)
    logger.info("Bankak account removed for owner %s", owner.phone)


def send_otp(phone: str) -> str:
    """
    Generate, store, and send OTP. Sets a 60-second resend cooldown.

    Returns the generated OTP (useful in tests / stub mode).
    """
    from django.conf import settings
    phone = format_phone(phone)

    # Single test-account bypass — active only when TEST_PHONE is set in env.
    # Remove TEST_PHONE from .env.prod to disable permanently.
    test_phone = getattr(settings, "TEST_PHONE", "")
    if test_phone and phone == test_phone:
        otp = getattr(settings, "TEST_OTP", "222222")
        store_otp_in_redis(phone, otp)
        set_otp_cooldown(phone)
        logger.info("[TEST ACCOUNT] Skipped SMS for test phone")
        return otp

    otp = generate_otp(length=getattr(settings, "OTP_LENGTH", 6))
    store_otp_in_redis(phone, otp)
    set_otp_cooldown(phone)
    success = send_sms_otp(phone, otp)
    if not success:
        logger.warning("Failed to send OTP SMS to %s", phone)
    return otp


def request_login_otp(phone: str, channel: str | None = None) -> None:
    """
    Issue a login OTP to an existing active user via the requested channel.

    Silently no-ops for unknown or inactive phones — the caller always
    receives the same response to prevent phone-number enumeration.

    Raises:
        OTPCooldownError:      Resend attempted within the cooldown window.
        BusinessLogicError:    Channel not in OTP_ALLOWED_CHANNELS.
        OTPDeliveryFailedError: Provider could not deliver (existing user only).
    """
    from django.conf import settings
    from apps.accounts.otp.providers import get_otp_sender

    phone = format_phone(phone)
    channel = channel or settings.DEFAULT_OTP_CHANNEL
    allowed = getattr(settings, "OTP_ALLOWED_CHANNELS", ["sms", "whatsapp"])

    if channel not in allowed:
        raise BusinessLogicError(
            f"Channel '{channel}' is not supported. Allowed: {', '.join(allowed)}",
            code="INVALID_CHANNEL",
        )

    remaining = get_channel_cooldown_remaining(phone, channel)
    if remaining > 0:
        raise OTPCooldownError(retry_after=remaining)

    try:
        user = CustomUser.objects.get(phone=phone)
        if not user.is_active:
            logger.info("Login OTP skipped — inactive user %s", mask_phone(phone))
            return
    except CustomUser.DoesNotExist:
        logger.info("Login OTP skipped — unregistered phone %s", mask_phone(phone))
        return

    otp = generate_otp()
    store_channel_otp(phone, otp, channel)
    set_channel_cooldown(phone, channel)
    reset_otp_attempts(phone, channel)

    result = get_otp_sender().send_otp(phone, otp, channel)
    if not result.success:
        logger.error(
            "OTP delivery failed: channel=%s phone=%s error=%s",
            channel, mask_phone(phone), result.error,
        )
        raise OTPDeliveryFailedError()


def verify_login_otp(phone: str, otp: str, channel: str | None = None) -> dict:
    """
    Verify a login OTP and return JWT tokens on success.

    Returns:
        dict with 'access', 'refresh', and 'user' keys.

    Raises:
        InvalidOTPError:      Wrong OTP, expired OTP, or non-existing/inactive user.
        OTPMaxAttemptsError:  Too many wrong attempts (subclass of InvalidOTPError).
    """
    from django.conf import settings

    phone = format_phone(phone)
    channel = channel or settings.DEFAULT_OTP_CHANNEL
    max_attempts = getattr(settings, "OTP_MAX_ATTEMPTS", 5)

    # User must exist and be active (return same error to avoid enumeration)
    try:
        user = CustomUser.objects.get(phone=phone)
        if not user.is_active:
            raise InvalidOTPError()
    except CustomUser.DoesNotExist:
        raise InvalidOTPError()

    # OTP must exist in Redis
    if get_channel_otp_hash(phone, channel) is None:
        raise InvalidOTPError()

    # Lockout check (pre-comparison)
    attempts = get_otp_attempts(phone, channel)
    if attempts >= max_attempts:
        delete_channel_otp(phone, channel)
        raise OTPMaxAttemptsError()

    # Compare submitted OTP against stored hash
    if not verify_channel_otp(phone, otp, channel):
        increment_otp_attempts(phone, channel)
        raise InvalidOTPError()

    # Success path
    delete_channel_otp(phone, channel)
    reset_otp_attempts(phone, channel)

    user.is_verified = True
    user.last_login_at = timezone.now()
    user.save(update_fields=["is_verified", "last_login_at"])

    tokens = get_tokens_for_user(user)
    tokens["user"] = user
    logger.info("User logged in via OTP: channel=%s phone=%s", channel, mask_phone(phone))
    return tokens


def verify_otp(phone: str, otp: str) -> CustomUser:
    """
    Verify the OTP for a phone number and mark the user as verified.

    Args:
        phone: E.164-formatted phone number.
        otp: The OTP code submitted by the user.

    Returns:
        The verified CustomUser.

    Raises:
        InvalidOTPError: If OTP is incorrect or expired.
        CustomUser.DoesNotExist: If no user found for this phone.
    """
    phone = format_phone(phone)

    stored = get_otp_from_redis(phone)
    if stored is None:
        raise OTPExpiredError()

    if not verify_otp_from_redis(phone, otp):
        raise InvalidOTPError()

    user = CustomUser.objects.get(phone=phone)
    user.verify_phone()
    logger.info("User %s verified via OTP", phone)
    return user


def login_with_otp(phone: str, otp: str) -> dict:
    """
    Verify OTP and return JWT tokens if successful.

    Returns:
        dict with 'access', 'refresh', and 'user' keys.

    Raises:
        InvalidOTPError, OTPExpiredError, CustomUser.DoesNotExist
    """
    phone = format_phone(phone)

    stored = get_otp_from_redis(phone)
    if stored is None:
        raise OTPExpiredError()

    if not verify_otp_from_redis(phone, otp):
        raise InvalidOTPError()

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
    logger.info("User %s logged in via OTP", phone)
    return tokens


def login_with_password(phone: str, password: str) -> dict:
    """
    Authenticate user with phone + password and return JWT tokens.

    Returns:
        dict with 'access', 'refresh', and 'user' keys.

    Raises:
        BusinessLogicError: On invalid credentials.
    """
    phone = format_phone(phone)

    try:
        user = CustomUser.objects.get(phone=phone)
    except CustomUser.DoesNotExist:
        raise BusinessLogicError("Invalid phone number or password.")

    if not user.has_password:
        raise BusinessLogicError("This account does not have a password set. Please use OTP login.")

    authenticated_user = authenticate(username=phone, password=password)
    if not authenticated_user:
        raise BusinessLogicError("Invalid phone number or password.")

    if not authenticated_user.is_active:
        raise BusinessLogicError("This account has been deactivated.")

    authenticated_user.last_login_at = timezone.now()
    authenticated_user.save(update_fields=["last_login_at"])

    tokens = get_tokens_for_user(authenticated_user)
    tokens["user"] = authenticated_user
    logger.info("User %s logged in via password", phone)
    return tokens


def set_user_password(user: CustomUser, new_password: str) -> None:
    """Set or update a user's password."""
    user.set_password(new_password)
    user.has_password = True
    user.save(update_fields=["password", "has_password", "updated_at"])
    logger.info("Password updated for user %s", user.phone)
