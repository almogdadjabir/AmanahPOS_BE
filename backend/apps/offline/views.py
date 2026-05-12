"""
Offline support views — Bootstrap and Asset Manifest.
"""
import logging

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import BusinessLogicError
from apps.customers.models import Customer
from apps.inventory.models import ProductBatch, StockLevel
from apps.products.models import Category, Product
from apps.products.services import get_tenant_from_request
from apps.tenants.models import BusinessType, Shop

from .serializers import (
    AssetManifestItemSerializer,
    BootstrapBatchSerializer,
    BootstrapBusinessSerializer,
    BootstrapCategorySerializer,
    BootstrapCustomerSerializer,
    BootstrapProductSerializer,
    BootstrapShopSerializer,
    BootstrapStockSerializer,
    BootstrapSubscriptionSerializer,
)

logger = logging.getLogger(__name__)


class BootstrapView(APIView):
    """
    GET /api/v1/offline/bootstrap/

    Returns all data the mobile app needs after login so it can operate offline.
    Scoped strictly to the requesting user's active business (tenant).
    Optimised to run in 6 focused queries with no N+1.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        from django.db.models import Q
        from apps.subscriptions.models import Subscription

        ctx = {"request": request}
        user = request.user

        shops = Shop.objects.filter(business=tenant, is_active=True).order_by("-is_main", "name")

        active_subscription = (
            Subscription.objects
            .filter(business=tenant, is_active=True, end_date__gte=timezone.now().date())
            .select_related("plan")
            .order_by("-start_date")
            .first()
        )

        categories = Category.objects.filter(
            tenant=tenant, is_active=True
        ).order_by("sort_order", "name")

        # Cashiers: only shared (shop=NULL) + their assigned shop products
        if user.role == "cashier" and user.default_shop_id:
            products = Product.objects.filter(
                tenant=tenant, is_active=True,
            ).filter(
                Q(shop__isnull=True) | Q(shop_id=user.default_shop_id)
            ).select_related("category", "shop").order_by("name")
        else:
            products = Product.objects.filter(
                tenant=tenant, is_active=True
            ).select_related("category", "shop").order_by("name")

        customers = Customer.objects.filter(
            tenant=tenant, is_active=True
        ).order_by("name")

        # Restaurants have no inventory — return empty stock array.
        if tenant.business_type == BusinessType.RESTAURANT:
            stock_data = []
        elif user.role == "cashier" and user.default_shop_id:
            # Cashiers only receive stock for their assigned shop
            stock_qs = StockLevel.objects.filter(
                product__tenant=tenant, shop_id=user.default_shop_id
            ).select_related("product", "shop")
            stock_data = BootstrapStockSerializer(stock_qs, many=True, context=ctx).data
        else:
            stock_qs = StockLevel.objects.filter(
                product__tenant=tenant
            ).select_related("product", "shop")
            stock_data = BootstrapStockSerializer(stock_qs, many=True, context=ctx).data

        # Expiry batches — shop businesses only
        if tenant.business_type == BusinessType.RESTAURANT:
            expiry_batches_data = []
        elif user.role == "cashier" and user.default_shop_id:
            batch_qs = ProductBatch.objects.filter(
                product__tenant=tenant, shop_id=user.default_shop_id
            ).select_related("product", "shop")
            expiry_batches_data = BootstrapBatchSerializer(batch_qs, many=True, context=ctx).data
        else:
            batch_qs = ProductBatch.objects.filter(
                product__tenant=tenant
            ).select_related("product", "shop")
            expiry_batches_data = BootstrapBatchSerializer(batch_qs, many=True, context=ctx).data

        data = {
            "success": True,
            "server_time": timezone.now().isoformat(),
            "businesses": BootstrapBusinessSerializer([tenant], many=True, context=ctx).data,
            "shops": BootstrapShopSerializer(shops, many=True, context=ctx).data,
            "categories": BootstrapCategorySerializer(categories, many=True, context=ctx).data,
            "products": BootstrapProductSerializer(products, many=True, context=ctx).data,
            "customers": BootstrapCustomerSerializer(customers, many=True, context=ctx).data,
            "stock": stock_data,
            "expiry_batches": expiry_batches_data,
            "active_subscription": (
                BootstrapSubscriptionSerializer(active_subscription, context=ctx).data
                if active_subscription else None
            ),
        }

        logger.info(
            "Bootstrap served for tenant=%s products=%d categories=%d stock=%d",
            tenant.id,
            len(data["products"]),
            len(data["categories"]),
            len(data["stock"]),
        )
        return Response(data)


class AssetManifestView(APIView):
    """
    GET /api/v1/offline/assets/manifest/

    Returns a lightweight list of image URLs and their last-modified timestamps.
    Mobile apps use this to selectively download only changed images.
    Phase-1: no content hash — updated_at is used as the version signal.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        from apps.core.image_service import build_image_url

        assets = []

        for product in (
            Product.objects
            .filter(tenant=tenant, is_active=True)
            .exclude(thumbnail=None)
            .exclude(thumbnail="")
            .only("id", "thumbnail", "updated_at")
        ):
            assets.append({
                "id": product.id,
                "type": "product_thumbnail",
                "url": build_image_url(product.thumbnail, request=request),
                "updated_at": product.updated_at,
            })
            assets.append({
                "id": product.id,
                "type": "product_image",
                "url": build_image_url(product.image, request=request),
                "updated_at": product.updated_at,
            })

        for category in (
            Category.objects
            .filter(tenant=tenant, is_active=True)
            .exclude(thumbnail=None)
            .exclude(thumbnail="")
            .only("id", "thumbnail", "image", "updated_at")
        ):
            assets.append({
                "id": category.id,
                "type": "category_thumbnail",
                "url": build_image_url(category.thumbnail, request=request),
                "updated_at": category.updated_at,
            })
            assets.append({
                "id": category.id,
                "type": "category_image",
                "url": build_image_url(category.image, request=request),
                "updated_at": category.updated_at,
            })

        return Response({
            "success": True,
            "version": timezone.now().date().isoformat(),
            "assets": AssetManifestItemSerializer(assets, many=True).data,
        })
