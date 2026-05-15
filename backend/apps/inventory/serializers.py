"""
Serializers for the inventory app.
"""
from decimal import Decimal
from rest_framework import serializers
from .models import StockLevel, StockMovement, MovementType


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id", "product", "product_name", "shop", "shop_name",
            "movement_type", "quantity", "reference", "notes",
            "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class StockMovementCreateSerializer(serializers.Serializer):
    """Used for manual stock additions and adjustments."""
    product       = serializers.UUIDField()
    shop          = serializers.UUIDField()
    movement_type = serializers.ChoiceField(choices=MovementType.choices)
    quantity      = serializers.DecimalField(max_digits=12, decimal_places=3)
    reference     = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes         = serializers.CharField(required=False, allow_blank=True)
    expiry_date   = serializers.DateField(required=False, allow_null=True, default=None)
    batch_number  = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")

    def validate_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError("Quantity cannot be zero.")
        return value


class StockAdjustmentSerializer(serializers.Serializer):
    """For absolute stock adjustment (set to a specific number)."""
    product = serializers.UUIDField()
    shop = serializers.UUIDField()
    new_quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0"))
    notes = serializers.CharField(required=False, allow_blank=True)


class StockLevelSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = StockLevel
        fields = [
            "id", "product", "product_name", "product_sku",
            "shop", "shop_name", "quantity",
            "is_low_stock", "is_out_of_stock", "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class StockTransferSerializer(serializers.Serializer):
    """For transferring stock between shops."""
    product = serializers.UUIDField()
    from_shop = serializers.UUIDField()
    to_shop = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"))
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["from_shop"] == attrs["to_shop"]:
            raise serializers.ValidationError("Source and destination shops cannot be the same.")
        return attrs

from .models import ProductBatch


class ProductBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    shop_name    = serializers.CharField(source="shop.name",    read_only=True)
    is_expired   = serializers.BooleanField(read_only=True)

    class Meta:
        model  = ProductBatch
        fields = [
            "id", "product", "product_name", "shop", "shop_name",
            "quantity", "expiry_date", "batch_number", "notes",
            "is_expired", "last_notified_date",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "last_notified_date", "created_at", "updated_at"]


class ProductBatchWriteSerializer(serializers.Serializer):
    product      = serializers.UUIDField()
    shop         = serializers.UUIDField()
    quantity     = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=0)
    expiry_date  = serializers.DateField()
    batch_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    notes        = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_expiry_date(self, value):
        from datetime import date
        if value < date.today():
            raise serializers.ValidationError("Expiry date must be today or in the future.")
        return value


class ExpiryAlertSerializer(serializers.ModelSerializer):
    product_name  = serializers.CharField(source="product.name",       read_only=True)
    product_sku   = serializers.CharField(source="product.sku",        read_only=True)
    shop_name     = serializers.CharField(source="shop.name",          read_only=True)
    business_name = serializers.CharField(source="shop.business.name", read_only=True)
    is_expired    = serializers.BooleanField(read_only=True)

    class Meta:
        model  = ProductBatch
        fields = [
            "id", "product", "product_name", "product_sku",
            "shop", "shop_name", "business_name",
            "quantity", "expiry_date", "batch_number",
            "is_expired", "created_at",
        ]


from .models import InboundTransaction, InboundTransactionItem


class InboundItemInputSerializer(serializers.Serializer):
    product_id   = serializers.UUIDField()
    quantity     = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"))
    unit_cost    = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    expiry_date  = serializers.DateField(required=False, allow_null=True)
    batch_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")

    def validate_expiry_date(self, value):
        from datetime import date
        if value and value < date.today():
            raise serializers.ValidationError("Expiry date must be today or in the future.")
        return value


class InboundReceiveSerializer(serializers.Serializer):
    shop_id   = serializers.UUIDField()
    reference = serializers.CharField(max_length=255)
    notes     = serializers.CharField(required=False, allow_blank=True, default="")
    items     = InboundItemInputSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value


class InboundTransactionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model  = InboundTransactionItem
        fields = ["id", "product", "product_name", "quantity", "unit_cost", "expiry_date", "batch_number"]
        read_only_fields = ["id"]


class InboundTransactionSerializer(serializers.ModelSerializer):
    items      = InboundTransactionItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)
    shop_name  = serializers.CharField(source="shop.name", read_only=True)

    class Meta:
        model  = InboundTransaction
        fields = ["id", "reference", "notes", "shop", "shop_name", "item_count", "items", "created_at"]
        read_only_fields = ["id", "created_at"]
