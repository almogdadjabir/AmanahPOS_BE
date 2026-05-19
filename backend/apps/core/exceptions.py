"""
Custom exception handler for AmanaPOS API.
"""
import logging

from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied as DRFPermissionDenied,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns a consistent error response format.

    Format:
    {
        "success": false,
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "...",
            "details": {...}
        }
    }
    """
    # Handle Django built-in exceptions
    if isinstance(exc, DjangoValidationError):
        exc = ValidationError(detail=exc.message_dict if hasattr(exc, "message_dict") else exc.messages)

    if isinstance(exc, Http404):
        exc = NotFound()

    if isinstance(exc, PermissionDenied):
        exc = DRFPermissionDenied()

    # Call the default DRF exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        error_code = _get_error_code(exc)
        error_detail = _flatten_errors(response.data)

        response.data = {
            "success": False,
            "error": {
                "code": error_code,
                "message": _get_message(response.data),
                "details": error_detail if isinstance(response.data, dict) else None,
            },
        }
        return response

    # Unhandled exceptions
    logger.exception("Unhandled exception in view", exc_info=exc, extra={"context": str(context)})
    return Response(
        {
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "details": None,
            },
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def _get_error_code(exc: APIException) -> str:
    """Map exception types to error codes."""
    mapping = {
        ValidationError: "VALIDATION_ERROR",
        AuthenticationFailed: "AUTHENTICATION_FAILED",
        NotAuthenticated: "NOT_AUTHENTICATED",
        DRFPermissionDenied: "PERMISSION_DENIED",
    }
    for exc_type, code in mapping.items():
        if isinstance(exc, exc_type):
            return code

    # Instance-specific code (e.g. BusinessLogicError raised with code="PHONE_NOT_REGISTERED")
    if hasattr(exc, "detail") and hasattr(exc.detail, "code") and exc.detail.code:
        return str(exc.detail.code).upper()

    if hasattr(exc, "default_code") and exc.default_code:
        return exc.default_code.upper()

    return "ERROR"


def _get_message(data) -> str:
    """Extract a human-readable message from error data."""
    if isinstance(data, dict):
        if "detail" in data:
            detail = data["detail"]
            if isinstance(detail, list):
                return str(detail[0]) if detail else "An error occurred."
            return str(detail)
        if "non_field_errors" in data:
            errors = data["non_field_errors"]
            return str(errors[0]) if errors else "An error occurred."
        return "Validation error. Please check your input."
    if isinstance(data, list):
        return str(data[0]) if data else "An error occurred."
    return str(data)


def _flatten_errors(data) -> dict | None:
    """Convert DRF error structure to a flat dict."""
    if not isinstance(data, dict):
        return None
    result = {}
    for key, value in data.items():
        if key == "detail":
            continue
        if isinstance(value, list):
            result[key] = [str(v) for v in value]
        elif isinstance(value, dict):
            result[key] = _flatten_errors(value)
        else:
            result[key] = str(value)
    return result or None


class NotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "The requested resource was not found."
    default_code = "NOT_FOUND"


class BusinessLogicError(APIException):
    """Raised for domain/business logic violations."""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Business logic error."
    default_code = "BUSINESS_LOGIC_ERROR"

    def __init__(self, detail=None, code=None):
        super().__init__(detail=detail or self.default_detail, code=code or self.default_code)


class InsufficientStockError(BusinessLogicError):
    default_detail = "Insufficient stock for this operation."
    default_code = "INSUFFICIENT_STOCK"


class SubscriptionLimitError(BusinessLogicError):
    default_detail = "Your subscription plan does not allow this operation."
    default_code = "SUBSCRIPTION_LIMIT_EXCEEDED"


class InvalidOTPError(BusinessLogicError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid or expired OTP."
    default_code = "INVALID_OTP"




class OTPCooldownError(BusinessLogicError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_code = "OTP_COOLDOWN"

    def __init__(self, retry_after: int = 60):
        detail = f"Please wait {retry_after} seconds before requesting another OTP."
        super().__init__(detail=detail, code=self.default_code)
        self.retry_after = retry_after


class OTPMaxAttemptsError(InvalidOTPError):
    """Raised when max failed OTP attempts is reached — maps to INVALID_OTP (400)."""
    default_detail = "Invalid OTP."


class OTPDeliveryFailedError(BusinessLogicError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Could not send verification code. Please try again."
    default_code = "OTP_DELIVERY_FAILED"


class BankakAccountRequiredError(BusinessLogicError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "A Bankak account must be configured before using Bankak as a payment method."
    default_code = "BANKAK_ACCOUNT_REQUIRED"


class InvalidBankakAccountError(BusinessLogicError):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid Bankak account number format."
    default_code = "INVALID_BANKAK_ACCOUNT_NUMBER"
