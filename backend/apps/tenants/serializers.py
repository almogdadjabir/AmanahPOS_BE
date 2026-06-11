"""
Serializers for tenants app.
"""
from rest_framework import serializers
from django.utils import timezone

from apps.accounts.serializers import UserProfileSerializer
from .models import Business, Shop


class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = [
            "id", "business", "name", "address", "phone", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "business", "created_at", "updated_at"]


class ShopCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ["name", "address", "phone", "is_active"]

    def validate(self, attrs):
        business = self.context.get("business")
        if business:
            # Check subscription shop limit
            plan = business.subscription_plan
            if plan and business.shop_count >= plan.max_shops:
                from apps.core.exceptions import SubscriptionLimitError
                raise SubscriptionLimitError(
                    f"Your plan allows a maximum of {plan.max_shops} shops."
                )
        return attrs


class BusinessSerializer(serializers.ModelSerializer):
    owner = UserProfileSerializer(read_only=True)
    shops = ShopSerializer(many=True, read_only=True)
    shop_count = serializers.IntegerField(read_only=True)
    active_subscription = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = [
            "id", "name", "slug", "business_type", "owner", "logo",
            "address", "phone", "email",
            "tax_enabled", "tax_name", "tax_rate", "tax_inclusive",
            "active_subscription", "is_active", "shop_count", "shops",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "owner", "created_at", "updated_at"]

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
        p = sub.plan
        return {
            "id":            str(p.id),
            "name":          p.name,
            "max_shops":     p.max_shops,
            "max_products":  p.max_products,
            "max_users":     p.max_users,
            "features":      p.features,
            "is_free":       p.is_free,
            "price":         str(p.price),
            "currency":      p.currency,
            "end_date":      str(sub.end_date),
            "days_remaining": sub.days_remaining,
        }


class BusinessCreateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Business
        fields = ["name", "address", "phone", "email", "logo", "business_type"]

    def validate_email(self, value):
        return value or ""

    def create(self, validated_data):
        owner = self.context["request"].user
        business = Business.objects.create(owner=owner, **validated_data)
        return business


class BusinessUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Business
        fields = [
            "name", "address", "phone", "email", "logo", "is_active", "business_type",
            "tax_enabled", "tax_name", "tax_rate", "tax_inclusive",
        ]

    def validate_email(self, value):
        return value or ""

    def validate_tax_rate(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Tax rate must be between 0 and 100.")
        return value
