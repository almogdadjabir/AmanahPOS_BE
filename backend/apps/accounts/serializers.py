"""
Serializers for the accounts app.
"""
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.core.utils import format_phone, is_valid_phone
from .models import BankakAccount, CustomUser


class RegisterSerializer(serializers.Serializer):
    """Serializer for new user registration (phone + optional details)."""
    phone = serializers.CharField(max_length=20)
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    bankak_account_number = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid international phone number.")
        return format_phone(value)

    def validate_email(self, value: str) -> str:
        return value.lower() if value else value

    def validate_bankak_account_number(self, value: str) -> str:
        import re
        v = value.strip()
        if v and not re.match(r'^[\w\s\-]{4,50}$', v):
            raise serializers.ValidationError(
                "Account number must be 4–50 characters (letters, digits, spaces, hyphens)."
            )
        return v


# ── Bankak Account ────────────────────────────────────────────────────────────

class BankakAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankakAccount
        fields = ["id", "account_number", "is_default", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "is_default", "is_active", "created_at", "updated_at"]


class BankakAccountWriteSerializer(serializers.Serializer):
    account_number = serializers.CharField(max_length=50)

    def validate_account_number(self, value: str) -> str:
        import re
        v = value.strip()
        if not re.match(r'^[\w\s\-]{4,50}$', v):
            raise serializers.ValidationError(
                "Account number must be 4–50 characters (letters, digits, spaces, hyphens)."
            )
        return v


class OTPVerifySerializer(serializers.Serializer):
    """Serializer for verifying OTP during registration."""
    phone = serializers.CharField(max_length=20)
    otp = serializers.CharField(min_length=4, max_length=8)

    def validate_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid international phone number.")
        return format_phone(value)


_OTP_CHANNEL_CHOICES = ["sms", "whatsapp"]


class LoginOTPSerializer(serializers.Serializer):
    """Serializer for initiating OTP-based login."""
    phone   = serializers.CharField(max_length=20)
    channel = serializers.ChoiceField(choices=_OTP_CHANNEL_CHOICES, required=False)

    def validate_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return format_phone(value)


class LoginOTPVerifySerializer(serializers.Serializer):
    """
    Serializer for OTP login verification.

    Accepts optional fcm_token + platform so the mobile app can register
    its push token in the same request instead of making a separate call.
    """
    phone    = serializers.CharField(max_length=20)
    otp      = serializers.CharField(min_length=4, max_length=8)
    channel  = serializers.ChoiceField(choices=_OTP_CHANNEL_CHOICES, required=False)
    fcm_token   = serializers.CharField(max_length=512, required=False, allow_blank=True, default="")
    platform    = serializers.ChoiceField(
        choices=["android", "ios", "web"],
        required=False, allow_blank=True, default="",
    )
    device_id   = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    device_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    app_version = serializers.CharField(max_length=50,  required=False, allow_blank=True, default="")

    def validate_phone(self, value: str) -> str:
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return format_phone(value)

    def validate(self, attrs):
        # If a token is provided, platform is also required
        if attrs.get("fcm_token") and not attrs.get("platform"):
            raise serializers.ValidationError(
                {"platform": "platform is required when fcm_token is provided."}
            )
        return attrs


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
    bankak_account = serializers.SerializerMethodField()
    bankak_account_number = serializers.CharField(
        max_length=50, required=False, allow_blank=True, write_only=True
    )
    enabled_features = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "phone",
            "email",
            "full_name",
            "role",
            "is_staff",
            "is_verified",
            "has_password",
            "business_id",
            "default_shop_id",
            "bankak_account",
            "bankak_account_number",
            "enabled_features",
            "created_at",
            "last_login_at",
        ]
        read_only_fields = [
            "id",
            "phone",
            "role",
            "is_staff",
            "is_verified",
            "has_password",
            "business_id",
            "default_shop_id",
            "created_at",
            "last_login_at",
        ]

    def get_bankak_account(self, obj):
        if obj.role == "owner":
            target = obj
        else:
            # Cashiers/managers don't have their own bankak account — return the owner's
            business = obj.business
            if not business:
                return None
            target = business.owner

        account = target.bankak_accounts.filter(is_default=True, is_active=True).first()
        if not account:
            return None
        return {"id": str(account.id), "account_number": account.account_number}

    def get_enabled_features(self, obj) -> dict:
        business = obj.business
        if not business or not business.subscription_plan_id:
            return {}
        plan = business.subscription_plan
        return {k: bool(v) for k, v in (plan.features or {}).items()}

    def validate_bankak_account_number(self, value: str) -> str:
        import re
        v = value.strip()
        if v and not re.match(r'^[\w\s\-]{4,50}$', v):
            raise serializers.ValidationError(
                "Account number must be 4–50 characters (letters, digits, spaces, hyphens)."
            )
        return v

    def validate_email(self, value: str) -> str:
        if value:
            qs = CustomUser.objects.filter(email__iexact=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This email is already in use.")
        return value.lower() if value else value

    def update(self, instance, validated_data):
        bankak_number = validated_data.pop("bankak_account_number", None)
        instance = super().update(instance, validated_data)
        if bankak_number is not None:
            from apps.accounts.services import remove_bankak_account, set_bankak_account
            if bankak_number == "":
                remove_bankak_account(instance)
            else:
                set_bankak_account(instance, bankak_number)
        return instance


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
            "is_verified", "is_active", "default_shop_id", "last_login_at", "created_at",
        ]
        read_only_fields = fields


class StaffUserCreateSerializer(serializers.Serializer):
    """Owner creates a manager or cashier for their business."""
    phone = serializers.CharField(max_length=20)
    full_name = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(choices=["manager", "cashier"])
    default_shop_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_phone(self, value):
        if not is_valid_phone(value):
            raise serializers.ValidationError("Enter a valid international phone number.")
        formatted = format_phone(value)
        if CustomUser.objects.filter(phone=formatted).exists():
            raise serializers.ValidationError("A user with this phone already exists.")
        return formatted

    def validate_default_shop_id(self, value):
        if value is None:
            return value
        from apps.tenants.models import Shop
        business = self.context.get("business")
        if not Shop.objects.filter(pk=value, business=business, is_active=True).exists():
            raise serializers.ValidationError("Shop not found in your business.")
        return value


class StaffUserUpdateSerializer(serializers.ModelSerializer):
    """Owner updates a staff member's name, role, active status, or assigned shop."""
    default_shop_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = CustomUser
        fields = ["full_name", "role", "is_active", "default_shop_id"]

    def validate_role(self, value):
        if value == "owner":
            raise serializers.ValidationError("Cannot assign owner role to staff.")
        return value

    def validate_default_shop_id(self, value):
        if value is None:
            return value
        from apps.tenants.models import Shop
        business = self.context.get("business")
        if not Shop.objects.filter(pk=value, business=business, is_active=True).exists():
            raise serializers.ValidationError("Shop not found in your business.")
        return value
