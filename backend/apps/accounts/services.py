"""
Business logic for accounts: registration, OTP, login.
"""
import logging

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.exceptions import InvalidOTPError, OTPExpiredError, BusinessLogicError
from apps.core.utils import (
    generate_otp,
    store_otp_in_redis,
    verify_otp_from_redis,
    get_otp_from_redis,
    send_sms_otp,
    format_phone,
    set_otp_cooldown,
)
from .models import CustomUser

logger = logging.getLogger(__name__)


def get_tokens_for_user(user: CustomUser) -> dict:
    """Generate JWT access and refresh tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def register_user(phone: str, full_name: str, email: str | None = None) -> CustomUser:
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
    logger.info("Owner account created by staff: %s (id=%s)", phone, user.id)
    return user


def send_otp(phone: str) -> str:
    """
    Generate, store, and send OTP. Sets a 60-second resend cooldown.

    Returns the generated OTP (useful in tests / stub mode).
    """
    from django.conf import settings
    phone = format_phone(phone)
    otp = generate_otp(length=getattr(settings, "OTP_LENGTH", 6))
    store_otp_in_redis(phone, otp)
    set_otp_cooldown(phone)
    success = send_sms_otp(phone, otp)
    if not success:
        logger.warning("Failed to send OTP SMS to %s", phone)
    return otp


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
