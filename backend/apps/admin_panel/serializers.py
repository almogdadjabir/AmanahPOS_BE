from rest_framework import serializers
from django.utils import timezone

from apps.accounts.models import BankakAccount, CustomUser
from apps.tenants.models import Business, BusinessType, Shop
from apps.subscriptions.models import Plan, Subscription
from apps.sales.models import Sale


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
            "id", "name", "slug", "business_type", "is_active", "created_at",
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


class AdminPlanSerializer(serializers.ModelSerializer):
    """Plan row for admin plan management — includes subscription_count annotation."""
    subscription_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Plan
        fields = [
            "id", "name", "description", "price", "currency",
            "max_shops", "max_products", "max_users", "duration_days",
            "features", "is_active", "is_free", "sort_order",
            "subscription_count", "created_at", "updated_at",
        ]


class AdminPlanCreateUpdateSerializer(serializers.ModelSerializer):
    """Create or update a paid plan. is_free is intentionally excluded — demo access is separate."""

    class Meta:
        model = Plan
        fields = [
            "name", "description", "price", "currency",
            "max_shops", "max_products", "max_users", "duration_days",
            "features", "is_active", "sort_order",
        ]

    def validate_name(self, value):
        value = value.strip()
        qs = Plan.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A plan with this name already exists.")
        return value

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value


class AdminSubscriptionDetailSerializer(serializers.ModelSerializer):
    """Full subscription detail with business, owner, and plan info."""
    business_id    = serializers.UUIDField(source="business.id",              read_only=True)
    business_name  = serializers.CharField(source="business.name",            read_only=True)
    owner_id       = serializers.UUIDField(source="business.owner.id",        read_only=True)
    owner_name     = serializers.CharField(source="business.owner.full_name", read_only=True)
    owner_phone    = serializers.CharField(source="business.owner.phone",     read_only=True)
    plan_name      = serializers.CharField(source="plan.name",                read_only=True)
    plan_price     = serializers.DecimalField(source="plan.price", max_digits=10, decimal_places=2, read_only=True)
    plan_currency  = serializers.CharField(source="plan.currency",            read_only=True)
    plan_duration  = serializers.IntegerField(source="plan.duration_days",    read_only=True)
    plan_is_free   = serializers.BooleanField(source="plan.is_free",          read_only=True)
    max_shops      = serializers.IntegerField(source="plan.max_shops",        read_only=True)
    max_products   = serializers.IntegerField(source="plan.max_products",     read_only=True)
    max_users      = serializers.IntegerField(source="plan.max_users",        read_only=True)
    is_expired     = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id", "start_date", "end_date", "is_active", "is_expired", "days_remaining",
            "payment_reference", "notes", "created_at", "updated_at",
            "business_id", "business_name",
            "owner_id", "owner_name", "owner_phone",
            "plan_name", "plan_price", "plan_currency", "plan_duration", "plan_is_free",
            "max_shops", "max_products", "max_users",
        ]


class AdminSubscriptionCreateSerializer(serializers.Serializer):
    business_id       = serializers.UUIDField()
    plan_id           = serializers.UUIDField()
    start_date        = serializers.DateField()
    payment_reference = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes             = serializers.CharField(required=False, allow_blank=True)

    def validate_business_id(self, value):
        from apps.tenants.models import Business
        if not Business.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Business not found.")
        return value

    def validate_plan_id(self, value):
        if not Plan.objects.filter(pk=value, is_active=True).exists():
            raise serializers.ValidationError("Plan not found or inactive.")
        return value


class AdminSubscriptionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ["payment_reference", "notes"]


class MonthlyGrowthSerializer(serializers.Serializer):
    month = serializers.DateTimeField(format="%Y-%m")
    count = serializers.IntegerField()


class RecentOwnerSerializer(serializers.ModelSerializer):
    business_count          = serializers.IntegerField(read_only=True)
    has_active_subscription = serializers.BooleanField(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "id", "phone", "full_name", "is_active", "is_verified",
            "created_at", "last_login_at", "business_count", "has_active_subscription",
        ]


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
        fields = ["id", "name", "slug", "business_type", "is_active", "created_at",
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


# ── Business detail (nested) ─────────────────────────────────────────────────

class AdminBusinessShopSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Shop
        fields = ["id", "name", "address", "phone", "is_main", "is_active", "created_at"]


class AdminBusinessDetailSerializer(serializers.ModelSerializer):
    """Full business profile with nested shops + active subscription."""
    owner_id                = serializers.UUIDField(source="owner.id",        read_only=True)
    owner_name              = serializers.CharField(source="owner.full_name",  read_only=True)
    owner_phone             = serializers.CharField(source="owner.phone",      read_only=True)
    shop_count              = serializers.IntegerField(read_only=True)
    has_active_subscription = serializers.BooleanField(read_only=True)
    subscription_end_date   = serializers.DateField(read_only=True, allow_null=True)
    active_subscription     = serializers.SerializerMethodField()
    shops                   = serializers.SerializerMethodField()

    class Meta:
        model  = Business
        fields = [
            "id", "name", "slug", "business_type", "is_active", "created_at", "updated_at",
            "address", "phone", "email",
            "owner_id", "owner_name", "owner_phone",
            "shop_count", "has_active_subscription", "subscription_end_date",
            "active_subscription", "shops",
        ]

    def get_active_subscription(self, obj):
        today = timezone.now().date()
        sub = (
            obj.subscriptions
            .filter(is_active=True, end_date__gte=today)
            .select_related("plan")
            .order_by("-end_date")
            .first()
        )
        if not sub:
            return None
        return {
            "id":             str(sub.id),
            "plan_name":      sub.plan.name,
            "end_date":       str(sub.end_date),
            "days_remaining": sub.days_remaining,
        }

    def get_shops(self, obj):
        shops = obj.shops.order_by("-is_main", "name")
        return AdminBusinessShopSerializer(shops, many=True).data


class AdminBusinessUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Business
        fields = ["name", "address", "phone", "email", "business_type"]

    def validate_name(self, value):
        return value.strip() if value else value

    def validate_business_type(self, value):
        valid = [c[0] for c in BusinessType.choices]
        if value and value not in valid:
            raise serializers.ValidationError(f"Invalid business type. Choose from: {valid}.")
        return value


class AdminBusinessCreateSerializer(serializers.Serializer):
    owner_id      = serializers.UUIDField()
    name          = serializers.CharField(max_length=255)
    address       = serializers.CharField(max_length=500, required=False, allow_blank=True)
    phone         = serializers.CharField(max_length=20,  required=False, allow_blank=True)
    email         = serializers.EmailField(required=False, allow_blank=True)
    business_type = serializers.ChoiceField(
        choices=BusinessType.choices,
        default=BusinessType.SHOP,
        required=False,
    )

    def validate_owner_id(self, value):
        from apps.accounts.models import CustomUser
        if not CustomUser.objects.filter(id=value, is_staff=False, role="owner").exists():
            raise serializers.ValidationError("No owner account found with this ID.")
        return value

    def validate_name(self, value):
        return value.strip()


# ── Stats ─────────────────────────────────────────────────────────────────────

class AdminRecentTransactionSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='tenant.name',                 read_only=True)
    cashier_name  = serializers.CharField(source='cashier.full_name',           default='—')
    shop_name     = serializers.CharField(source='shop.name',                   read_only=True)

    class Meta:
        model  = Sale
        fields = [
            'id', 'receipt_number',
            'business_name', 'shop_name', 'cashier_name',
            'payment_method', 'net_amount', 'status', 'created_at',
        ]


class AdminStatsSerializer(serializers.Serializer):
    total_owners          = serializers.IntegerField()
    total_businesses      = serializers.IntegerField()
    total_shops           = serializers.IntegerField()
    active_subscriptions  = serializers.IntegerField()
    expired_subscriptions = serializers.IntegerField()
    new_owners_this_month = serializers.IntegerField()
    monthly_growth        = MonthlyGrowthSerializer(many=True)
    recent_owners         = RecentOwnerSerializer(many=True)
    recent_transactions   = AdminRecentTransactionSerializer(many=True)
