from rest_framework import serializers
from django.utils import timezone

from apps.accounts.models import BankakAccount, CustomUser
from apps.tenants.models import Business, Shop
from apps.subscriptions.models import Subscription, Plan


class AdminBankakAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankakAccount
        fields = ["id", "account_number", "is_default", "is_active", "created_at", "updated_at"]
        read_only_fields = fields


class AdminOwnerSerializer(serializers.ModelSerializer):
    """Owner row for the admin owners list."""
    business_count        = serializers.IntegerField(read_only=True)
    has_active_subscription = serializers.BooleanField(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "id", "phone", "full_name", "is_active", "is_verified",
            "created_at", "last_login_at",
            "business_count", "has_active_subscription",
        ]


class AdminBusinessSerializer(serializers.ModelSerializer):
    """Business row for the admin businesses list."""
    owner_name              = serializers.CharField(source="owner.full_name", read_only=True)
    owner_phone             = serializers.CharField(source="owner.phone",     read_only=True)
    shop_count              = serializers.IntegerField(read_only=True)
    has_active_subscription = serializers.BooleanField(read_only=True)
    subscription_end_date   = serializers.DateField(read_only=True)

    class Meta:
        model = Business
        fields = [
            "id", "name", "slug", "is_active", "created_at",
            "owner_name", "owner_phone",
            "shop_count", "has_active_subscription", "subscription_end_date",
        ]


class AdminSubscriptionSerializer(serializers.ModelSerializer):
    """Subscription row for the admin subscriptions list."""
    business_name  = serializers.CharField(source="business.name",            read_only=True)
    owner_name     = serializers.CharField(source="business.owner.full_name", read_only=True)
    owner_phone    = serializers.CharField(source="business.owner.phone",     read_only=True)
    plan_name      = serializers.CharField(source="plan.name",                read_only=True)
    plan_price     = serializers.DecimalField(source="plan.price", max_digits=10, decimal_places=2, read_only=True)
    plan_currency  = serializers.CharField(source="plan.currency",            read_only=True)
    is_expired     = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id", "business_name", "owner_name", "owner_phone",
            "plan_name", "plan_price", "plan_currency",
            "start_date", "end_date", "is_active", "is_expired", "days_remaining",
            "payment_reference", "created_at",
        ]


class MonthlyGrowthSerializer(serializers.Serializer):
    month = serializers.DateTimeField(format="%Y-%m")
    count = serializers.IntegerField()


class RecentOwnerSerializer(serializers.ModelSerializer):
    business_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CustomUser
        fields = ["id", "phone", "full_name", "is_active", "created_at", "business_count"]


# ── Owner detail (nested) ────────────────────────────────────────────────────

class AdminOwnerShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ["id", "name", "address", "phone", "is_active", "created_at"]


class AdminOwnerBusinessSerializer(serializers.ModelSerializer):
    shops              = AdminOwnerShopSerializer(many=True, read_only=True)
    active_subscription = serializers.SerializerMethodField()
    shop_count         = serializers.SerializerMethodField()

    class Meta:
        model  = Business
        fields = ["id", "name", "slug", "is_active", "created_at",
                  "shop_count", "active_subscription", "shops"]

    def get_active_subscription(self, obj):
        today = timezone.now().date()
        for sub in obj.subscriptions.all():
            if sub.is_active and sub.end_date >= today:
                return {
                    "id":             str(sub.id),
                    "plan_name":      sub.plan.name,
                    "end_date":       str(sub.end_date),
                    "days_remaining": sub.days_remaining,
                }
        return None

    def get_shop_count(self, obj):
        return sum(1 for s in obj.shops.all() if s.is_active)


class AdminOwnerDetailSerializer(serializers.ModelSerializer):
    businesses              = AdminOwnerBusinessSerializer(many=True, read_only=True)
    business_count          = serializers.IntegerField(read_only=True)
    has_active_subscription = serializers.BooleanField(read_only=True)
    email                   = serializers.EmailField(read_only=True, allow_null=True)
    bankak_account          = serializers.SerializerMethodField()

    class Meta:
        model  = CustomUser
        fields = [
            "id", "phone", "email", "full_name", "is_active", "is_verified",
            "has_password", "created_at", "updated_at", "last_login_at",
            "business_count", "has_active_subscription",
            "bankak_account",
            "businesses",
        ]

    def get_bankak_account(self, obj):
        account = obj.bankak_accounts.filter(is_default=True, is_active=True).first()
        if not account:
            return None
        return AdminBankakAccountSerializer(account).data


class AdminOwnerUpdateSerializer(serializers.ModelSerializer):
    bankak_account_number = serializers.CharField(
        max_length=50, required=False, allow_blank=True, write_only=True
    )

    class Meta:
        model  = CustomUser
        fields = ["full_name", "email", "bankak_account_number"]

    def validate_email(self, value):
        return value.lower().strip() if value else value

    def validate_bankak_account_number(self, value):
        import re
        v = value.strip()
        if v and not re.match(r'^[\w\s\-]{4,50}$', v):
            raise serializers.ValidationError(
                "Account number must be 4–50 characters (letters, digits, spaces, hyphens)."
            )
        return v

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


# ── Stats ─────────────────────────────────────────────────────────────────────

class AdminStatsSerializer(serializers.Serializer):
    total_owners          = serializers.IntegerField()
    total_businesses      = serializers.IntegerField()
    total_shops           = serializers.IntegerField()
    active_subscriptions  = serializers.IntegerField()
    expired_subscriptions = serializers.IntegerField()
    new_owners_this_month = serializers.IntegerField()
    monthly_growth        = MonthlyGrowthSerializer(many=True)
    recent_owners         = RecentOwnerSerializer(many=True)
