"""
Serializers for the accounts app.
"""
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.core.utils import format_phone, is_valid_phone
from .models import CustomUser


class RegisterSerializer(serializers.Serializer):
    """Serializer for new user registration (phone + optional details)."""
    phone = serializers.CharField(max_length=20)
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid international phone number.")
        return format_phone(value)

    def validate_email(self, value: str) -> str:
        return value.lower() if value else value


class OTPVerifySerializer(serializers.Serializer):
    """Serializer for verifying OTP during registration."""
    phone = serializers.CharField(max_length=20)
    otp = serializers.CharField(min_length=4, max_length=8)

    def validate_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid international phone number.")
        return format_phone(value)


class LoginOTPSerializer(serializers.Serializer):
    """Serializer for initiating OTP-based login."""
    phone = serializers.CharField(max_length=20)

    def validate_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return format_phone(value)


class LoginPasswordSerializer(serializers.Serializer):
    """Serializer for password-based login."""
    phone = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return format_phone(value)


class UserProfileSerializer(serializers.ModelSerializer):
    """Read/Update serializer for user profile."""

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "phone",
            "email",
            "full_name",
            "role",
            "is_verified",
            "has_password",
            "created_at",
            "last_login_at",
        ]
        read_only_fields = [
            "id",
            "phone",
            "role",
            "is_verified",
            "has_password",
            "created_at",
            "last_login_at",
        ]

    def validate_email(self, value: str) -> str:
        if value:
            qs = CustomUser.objects.filter(email__iexact=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This email is already in use.")
        return value.lower() if value else value


class SetPasswordSerializer(serializers.Serializer):
    """Serializer for setting or changing user password."""
    password = serializers.CharField(
        min_length=8,
        write_only=True,
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )
    current_password = serializers.CharField(
        write_only=True,
        required=False,
        style={"input_type": "password"},
        help_text="Required only when changing an existing password.",
    )

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        validate_password(attrs["password"])
        return attrs

    def validate_current_password(self, value):
        user = self.context["request"].user
        if user.has_password and not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class TokenResponseSerializer(serializers.Serializer):
    """Schema-only serializer for token response documentation."""
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserProfileSerializer()


class ResendOTPSerializer(serializers.Serializer):
    """Serializer for re-sending OTP."""
    phone = serializers.CharField(max_length=20)

    def validate_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return format_phone(value)


class StaffUserSerializer(serializers.ModelSerializer):
    """Read serializer for staff users in a business."""

    class Meta:
        model = CustomUser
        fields = [
            "id", "phone", "full_name", "role",
            "is_verified", "is_active", "last_login_at", "created_at",
        ]
        read_only_fields = fields


class StaffUserCreateSerializer(serializers.Serializer):
    """Owner creates a manager or cashier for their business."""
    phone = serializers.CharField(max_length=20)
    full_name = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(choices=["manager", "cashier"])

    def validate_phone(self, value):
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid international phone number.")
        formatted = format_phone(value)
        if CustomUser.objects.filter(phone=formatted).exists():
            raise serializers.ValidationError("A user with this phone already exists.")
        return formatted


class StaffUserUpdateSerializer(serializers.ModelSerializer):
    """Owner updates a staff member's name, role, or active status."""

    class Meta:
        model = CustomUser
        fields = ["full_name", "role", "is_active"]

    def validate_role(self, value):
        if value == "owner":
            raise serializers.ValidationError("Cannot assign owner role to staff.")
        return value
