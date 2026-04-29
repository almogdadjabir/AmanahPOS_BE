"""
Serializers for the products app.
"""
from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            "id", "tenant", "parent", "name", "description", "image",
            "is_active", "sort_order", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]


class CategoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["parent", "name", "description", "image", "sort_order"]

    def validate_parent(self, value):
        if value:
            tenant = self.context.get("tenant")
            if value.tenant_id != tenant.id:
                raise serializers.ValidationError("Parent category does not belong to this business.")
        return value


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    stock_level = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "tenant", "shop", "shop_name", "category", "category_name",
            "name", "description", "sku", "barcode", "price", "cost_price",
            "image", "unit", "is_active", "track_inventory", "min_stock_level",
            "stock_level", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]

    def get_stock_level(self, obj):
        """Return current stock level from inventory (if available)."""
        try:
            from apps.inventory.models import StockLevel
            stock = StockLevel.objects.filter(product=obj).first()
            return stock.quantity if stock else 0
        except Exception:
            return None


class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "shop", "category", "name", "description", "sku", "barcode",
            "price", "cost_price", "image", "unit", "is_active",
            "track_inventory", "min_stock_level",
        ]

    def validate_shop(self, value):
        tenant = self.context.get("tenant")
        if value and value.business_id != tenant.id:
            raise serializers.ValidationError("Shop does not belong to this business.")
        return value

    def validate_category(self, value):
        tenant = self.context.get("tenant")
        if value and value.tenant_id != tenant.id:
            raise serializers.ValidationError("Category does not belong to this business.")
        return value

    def validate_sku(self, value):
        if value:
            tenant = self.context.get("tenant")
            qs = Product.objects.filter(tenant=tenant, sku=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("A product with this SKU already exists in your business.")
        return value

    def validate_barcode(self, value):
        if value:
            tenant = self.context.get("tenant")
            qs = Product.objects.filter(tenant=tenant, barcode=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("A product with this barcode already exists in your business.")
        return value
