"""
Serializers for tenants app.
"""
from rest_framework import serializers

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

    class Meta:
        model = Business
        fields = [
            "id", "name", "slug", "owner", "logo", "address", "phone", "email",
            "subscription_plan", "is_active", "shop_count", "shops",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "owner", "created_at", "updated_at"]


class BusinessCreateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Business
        fields = ["name", "address", "phone", "email", "logo"]

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
        fields = ["name", "address", "phone", "email", "logo", "is_active"]

    def validate_email(self, value):
        return value or ""
