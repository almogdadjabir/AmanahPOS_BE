"""
Read-only serializers for the offline bootstrap endpoint.
All serializers are lightweight and optimised for bulk reads with no N+1 queries.
"""
from rest_framework import serializers

from apps.accounts.models import CustomUser
from apps.customers.models import Customer
from apps.inventory.models import StockLevel
from apps.products.models import Category, Product
from apps.subscriptions.models import Plan, Subscription
from apps.tenants.models import Business, Shop


# ── Business ──────────────────────────────────────────────────────────────────

class BootstrapBusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = [
            "id", "name", "slug", "business_type",
            "address", "phone", "email",
            "currency", "timezone",
            "tax_enabled", "tax_name", "tax_rate", "tax_inclusive",
            "is_active", "updated_at",
        ]


# ── Shops ─────────────────────────────────────────────────────────────────────

class BootstrapShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ["id", "name", "address", "phone", "is_main", "is_active", "updated_at"]


# ── Categories ────────────────────────────────────────────────────────────────

class BootstrapCategorySerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id", "parent", "name", "description",
            "image", "thumbnail_url",
            "sort_order", "is_active", "updated_at",
        ]

    def get_image(self, obj) -> str | None:
        from apps.core.image_service import build_image_url
        v = int(obj.updated_at.timestamp()) if obj.updated_at else None
        return build_image_url(obj.image, request=self.context.get("request"), version=v)

    def get_thumbnail_url(self, obj) -> str | None:
        from apps.core.image_service import build_image_url
        v = int(obj.updated_at.timestamp()) if obj.updated_at else None
        return build_image_url(obj.thumbnail, request=self.context.get("request"), version=v)


# ── Products ──────────────────────────────────────────────────────────────────

class BootstrapProductSerializer(serializers.ModelSerializer):
    """
    Compact product serializer for bootstrap.
    Stock level is returned separately in the 'stock' array to avoid N+1 queries.
    """
    image = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "shop", "category",
            "name", "description", "sku", "barcode",
            "price", "cost_price",
            "image", "thumbnail_url",
            "unit", "is_active", "track_inventory", "min_stock_level", "expiry_alert_days",
            "updated_at",
        ]

    def get_image(self, obj) -> str | None:
        from apps.core.image_service import build_image_url
        v = int(obj.updated_at.timestamp()) if obj.updated_at else None
        return build_image_url(obj.image, request=self.context.get("request"), version=v)

    def get_thumbnail_url(self, obj) -> str | None:
        from apps.core.image_service import build_image_url
        v = int(obj.updated_at.timestamp()) if obj.updated_at else None
        return build_image_url(obj.thumbnail, request=self.context.get("request"), version=v)


# ── Customers ─────────────────────────────────────────────────────────────────

class BootstrapCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id", "name", "phone", "email",
            "loyalty_points", "is_active", "updated_at",
        ]


# ── Stock ─────────────────────────────────────────────────────────────────────

class BootstrapStockSerializer(serializers.ModelSerializer):
    """
    Returns product_id / shop_id as flat IDs for efficient mobile lookup.
    """
    class Meta:
        model = StockLevel
        fields = ["product_id", "shop_id", "quantity", "updated_at"]


# ── Active Subscription ───────────────────────────────────────────────────────

class BootstrapPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            "id", "name", "price", "currency",
            "max_shops", "max_products", "max_users",
            "duration_days", "features", "is_free",
        ]


class BootstrapSubscriptionSerializer(serializers.ModelSerializer):
    plan         = BootstrapPlanSerializer(read_only=True)
    is_expired   = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id", "plan",
            "start_date", "end_date",
            "is_active", "is_expired", "days_remaining",
        ]


# ── Asset Manifest ────────────────────────────────────────────────────────────

class AssetManifestItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    type = serializers.CharField()
    url = serializers.CharField(allow_null=True)
    updated_at = serializers.DateTimeField()

from apps.inventory.models import ProductBatch


class BootstrapBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    shop_name    = serializers.CharField(source="shop.name",    read_only=True)
    is_expired   = serializers.BooleanField(read_only=True)

    class Meta:
        model  = ProductBatch
        fields = [
            "id", "product", "product_name", "shop", "shop_name",
            "quantity", "expiry_date", "batch_number", "is_expired", "updated_at",
        ]
