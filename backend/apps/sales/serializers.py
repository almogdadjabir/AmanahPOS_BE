"""
Serializers for the sales app.
"""
from decimal import Decimal
from rest_framework import serializers
from .models import Sale, SaleItem, PaymentMethod


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            "id", "product", "product_name", "product_sku",
            "quantity", "unit_price", "discount", "subtotal",
        ]
        read_only_fields = ["id", "subtotal"]


class SaleItemInputSerializer(serializers.Serializer):
    """Input for individual sale items."""
    product_id = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"))
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal("0"))
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0"))


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    cashier_name = serializers.CharField(source="cashier.full_name", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id", "tenant", "shop", "shop_name", "cashier", "cashier_name",
            "customer", "customer_name", "receipt_number",
            "total_amount", "discount_amount", "tax_amount", "net_amount",
            "payment_method", "status", "notes", "item_count",
            "items", "synced_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "tenant", "receipt_number", "net_amount",
            "created_at", "updated_at", "synced_at",
        ]


class CreateSaleSerializer(serializers.Serializer):
    """Input serializer for creating a new sale."""
    shop = serializers.UUIDField()
    items = SaleItemInputSerializer(many=True, min_length=1)
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    customer = serializers.UUIDField(required=False, allow_null=True)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0"))
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0"))
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_discount_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Discount cannot be negative.")
        return value

    def validate_tax_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Tax cannot be negative.")
        return value


class CancelSaleSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
