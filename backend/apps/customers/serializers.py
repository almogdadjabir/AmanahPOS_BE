from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    total_purchases = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Customer
        fields = [
            "id", "tenant", "name", "phone", "email", "address",
            "loyalty_points", "notes", "is_active",
            "total_purchases", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "tenant", "loyalty_points", "created_at", "updated_at"]


class CustomerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["name", "phone", "email", "address", "notes"]

    def validate_phone(self, value):
        if value:
            from apps.core.utils import is_valid_phone, format_phone
            if not is_valid_phone(value):
                raise serializers.ValidationError("Enter a valid phone number.")
            return format_phone(value)
        return value

    def validate(self, attrs):
        tenant = self.context.get("tenant")
        phone = attrs.get("phone")
        if phone and tenant:
            qs = Customer.objects.filter(tenant=tenant, phone=phone)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"phone": "A customer with this phone number already exists in this business."}
                )
        return attrs
