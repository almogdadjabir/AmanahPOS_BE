from rest_framework import serializers
from .models import Plan, Subscription


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            "id", "name", "description", "price", "currency",
            "max_shops", "max_products", "max_users",
            "duration_days", "features", "is_active", "is_free",
            "sort_order", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id", "business", "plan", "start_date", "end_date",
            "is_active", "is_expired", "days_remaining",
            "payment_reference", "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "start_date", "end_date", "created_at", "updated_at"]


class SubscribeSerializer(serializers.Serializer):
    """Input for subscribing to a plan."""
    plan_id = serializers.UUIDField()
    payment_reference = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_plan_id(self, value):
        try:
            Plan.objects.get(pk=value, is_active=True)
        except Plan.DoesNotExist:
            raise serializers.ValidationError("Plan not found or inactive.")
        return value
