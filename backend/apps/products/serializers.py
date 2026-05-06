"""
Serializers for the products app.
"""
from rest_framework import serializers

from apps.core.image_service import build_image_url
from .models import Category, Product


# ── Category ──────────────────────────────────────────────────────────────────

class CategorySerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id", "tenant", "parent", "name", "description",
            "image", "thumbnail_url",
            "is_active", "sort_order", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]

    def get_image(self, obj) -> str | None:
        return build_image_url(obj.image, request=self.context.get("request"))

    def get_thumbnail_url(self, obj) -> str | None:
        return build_image_url(obj.thumbnail, request=self.context.get("request"))


class CategoryCreateSerializer(serializers.ModelSerializer):
    image_upload = serializers.ImageField(
        write_only=True, required=False, allow_null=True,
        help_text="Upload a category image (JPEG/PNG/WebP, max 10 MB).",
    )

    class Meta:
        model = Category
        fields = ["parent", "name", "description", "image_upload", "sort_order"]

    def validate_parent(self, value):
        if value:
            tenant = self.context.get("tenant")
            if value.tenant_id != tenant.id:
                raise serializers.ValidationError("Parent category does not belong to this business.")
        return value

    def validate_image_upload(self, value):
        if value is None:
            return None
        from django.conf import settings
        max_mb = getattr(settings, "MAX_IMAGE_UPLOAD_MB", 10)
        value.seek(0, 2)
        size = value.tell()
        value.seek(0)
        if size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(f"Image too large. Maximum size is {max_mb} MB.")
        return value


# ── Product ───────────────────────────────────────────────────────────────────

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    stock_level = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "tenant", "shop", "shop_name", "category", "category_name",
            "name", "description", "sku", "barcode", "price", "cost_price",
            "image", "thumbnail_url", "unit", "is_active", "track_inventory",
            "min_stock_level", "stock_level", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]

    def get_image(self, obj) -> str | None:
        return build_image_url(obj.image, request=self.context.get("request"))

    def get_thumbnail_url(self, obj) -> str | None:
        return build_image_url(obj.thumbnail, request=self.context.get("request"))

    def get_stock_level(self, obj):
        try:
            from apps.inventory.models import StockLevel
            from django.db.models import Sum
            result = StockLevel.objects.filter(product=obj).aggregate(total=Sum("quantity"))
            total = result["total"]
            if total is None:
                return 0
            # Return as int if whole number, float otherwise
            return int(total) if total == int(total) else float(total)
        except Exception:
            return None


class ProductCreateSerializer(serializers.ModelSerializer):
    image_upload = serializers.ImageField(
        write_only=True, required=False, allow_null=True,
        help_text="Upload a product image (JPEG/PNG/WebP, max 10 MB).",
    )

    class Meta:
        model = Product
        fields = [
            "shop", "category", "name", "description", "sku", "barcode",
            "price", "cost_price", "image_upload", "unit", "is_active",
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

    def validate_image_upload(self, value):
        if value is None:
            return None
        from django.conf import settings
        max_mb = getattr(settings, "MAX_IMAGE_UPLOAD_MB", 10)
        value.seek(0, 2)
        size = value.tell()
        value.seek(0)
        if size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(f"Image too large. Maximum size is {max_mb} MB.")
        return value

    def validate(self, data):
        if not data.get("shop"):
            tenant = self.context.get("tenant")
            main_shop = tenant.shops.filter(is_main=True, is_active=True).first()
            if main_shop:
                data["shop"] = main_shop
        return data
