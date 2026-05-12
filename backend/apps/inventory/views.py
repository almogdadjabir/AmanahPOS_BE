"""
Views for the inventory app.
"""
import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import NotFound, BusinessLogicError
from apps.core.pagination import StandardPagination
from apps.products.models import Product
from apps.products.services import get_tenant_from_request
from apps.tenants.models import BusinessType, Shop
from .models import StockLevel, StockMovement
from .serializers import (
    StockAdjustmentSerializer,
    StockLevelSerializer,
    StockMovementCreateSerializer,
    StockMovementSerializer,
    StockTransferSerializer,
)
from .services import add_stock, adjust_stock, deduct_stock, transfer_stock

logger = logging.getLogger(__name__)


class StockLevelListView(APIView):
    """
    GET /api/v1/inventory/stock/
    List stock levels for a tenant, optionally filtered by shop or product.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        # Restaurants have no inventory — return empty paginated response.
        if tenant.business_type == BusinessType.RESTAURANT:
            paginator = StandardPagination()
            paginator.paginate_queryset([], request)
            return paginator.get_paginated_response([])

        qs = StockLevel.objects.filter(
            product__tenant=tenant
        ).select_related("product", "shop")

        shop_id = request.query_params.get("shop")
        if shop_id:
            qs = qs.filter(shop_id=shop_id)

        product_id = request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)

        low_stock = request.query_params.get("low_stock")
        if low_stock == "true":
            from django.db.models import F
            qs = qs.filter(quantity__lte=F("product__min_stock_level"))

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = StockLevelSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class StockMovementListView(APIView):
    """
    GET /api/v1/inventory/movements/
    List all stock movements for a tenant.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        if tenant.business_type == BusinessType.RESTAURANT:
            paginator = StandardPagination()
            paginator.paginate_queryset([], request)
            return paginator.get_paginated_response([])

        qs = StockMovement.objects.filter(
            product__tenant=tenant
        ).select_related("product", "shop", "created_by").order_by("-created_at")

        product_id = request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)

        shop_id = request.query_params.get("shop")
        if shop_id:
            qs = qs.filter(shop_id=shop_id)

        movement_type = request.query_params.get("type")
        if movement_type:
            qs = qs.filter(movement_type=movement_type)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = StockMovementSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class StockAddView(APIView):
    """
    POST /api/v1/inventory/stock/add/
    Manually add stock.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        if tenant.business_type == BusinessType.RESTAURANT:
            raise BusinessLogicError("Inventory management is not available for restaurant businesses.")

        serializer = StockMovementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            product = Product.objects.get(pk=data["product"], tenant=tenant)
            shop = Shop.objects.get(pk=data["shop"], business=tenant)
        except (Product.DoesNotExist, Shop.DoesNotExist):
            raise NotFound("Product or shop not found.")

        movement = add_stock(
            product=product,
            shop=shop,
            quantity=data["quantity"],
            reference=data.get("reference", ""),
            notes=data.get("notes", ""),
            created_by=request.user,
            movement_type=data["movement_type"],
        )
        return Response(
            {
                "success": True,
                "message": "Stock added successfully.",
                "data": StockMovementSerializer(movement).data,
            },
            status=status.HTTP_201_CREATED,
        )


class StockAdjustView(APIView):
    """
    POST /api/v1/inventory/stock/adjust/
    Adjust stock to a specific quantity.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        if tenant.business_type == BusinessType.RESTAURANT:
            raise BusinessLogicError("Inventory management is not available for restaurant businesses.")

        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            product = Product.objects.get(pk=data["product"], tenant=tenant)
            shop = Shop.objects.get(pk=data["shop"], business=tenant)
        except (Product.DoesNotExist, Shop.DoesNotExist):
            raise NotFound("Product or shop not found.")

        movement = adjust_stock(
            product=product,
            shop=shop,
            new_quantity=data["new_quantity"],
            notes=data.get("notes", ""),
            created_by=request.user,
        )
        return Response(
            {
                "success": True,
                "message": "Stock adjusted successfully.",
                "data": StockMovementSerializer(movement).data,
            },
            status=status.HTTP_201_CREATED,
        )


class StockTransferView(APIView):
    """
    POST /api/v1/inventory/stock/transfer/
    Transfer stock between shops.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        if tenant.business_type == BusinessType.RESTAURANT:
            raise BusinessLogicError("Inventory management is not available for restaurant businesses.")

        serializer = StockTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            product = Product.objects.get(pk=data["product"], tenant=tenant)
            from_shop = Shop.objects.get(pk=data["from_shop"], business=tenant)
            to_shop = Shop.objects.get(pk=data["to_shop"], business=tenant)
        except (Product.DoesNotExist, Shop.DoesNotExist):
            raise NotFound("Product or shop not found.")

        out_movement, in_movement = transfer_stock(
            product=product,
            from_shop=from_shop,
            to_shop=to_shop,
            quantity=data["quantity"],
            notes=data.get("notes", ""),
            created_by=request.user,
        )

        return Response(
            {
                "success": True,
                "message": "Stock transferred successfully.",
                "data": {
                    "outgoing": StockMovementSerializer(out_movement).data,
                    "incoming": StockMovementSerializer(in_movement).data,
                },
            },
            status=status.HTTP_201_CREATED,
        )

from .models import ProductBatch
from .serializers import ProductBatchSerializer, ProductBatchWriteSerializer, ExpiryAlertSerializer


class BatchListView(APIView):
    """
    GET  /api/v1/inventory/batches/   — list batches for tenant (shop only)
    POST /api/v1/inventory/batches/   — create a batch
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if tenant.business_type == BusinessType.RESTAURANT:
            paginator = StandardPagination()
            paginator.paginate_queryset([], request)
            return paginator.get_paginated_response([])

        qs = (
            ProductBatch.objects
            .filter(product__tenant=tenant)
            .select_related("product", "shop")
            .order_by("expiry_date")
        )

        shop_id = request.query_params.get("shop")
        if shop_id:
            qs = qs.filter(shop_id=shop_id)

        product_id = request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(ProductBatchSerializer(page, many=True).data)

    def post(self, request):
        tenant = get_tenant_from_request(request)
        if tenant.business_type == BusinessType.RESTAURANT:
            return Response(
                {"success": False, "message": "Expiry tracking is not available for restaurant businesses."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ProductBatchWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        try:
            product = Product.objects.get(pk=vd["product"], tenant=tenant)
        except Product.DoesNotExist:
            raise NotFound("Product not found.")

        try:
            shop = Shop.objects.get(pk=vd["shop"], business=tenant)
        except Shop.DoesNotExist:
            raise NotFound("Shop not found.")

        batch = ProductBatch.objects.create(
            product=product,
            shop=shop,
            quantity=vd["quantity"],
            expiry_date=vd["expiry_date"],
            batch_number=vd.get("batch_number", ""),
            notes=vd.get("notes", ""),
        )
        return Response(
            {"success": True, "data": ProductBatchSerializer(batch).data},
            status=status.HTTP_201_CREATED,
        )


class BatchDetailView(APIView):
    """
    GET    /api/v1/inventory/batches/<pk>/
    PATCH  /api/v1/inventory/batches/<pk>/
    DELETE /api/v1/inventory/batches/<pk>/
    """
    permission_classes = [IsAuthenticated]

    def _get_batch(self, pk, tenant):
        try:
            return ProductBatch.objects.select_related("product", "shop").get(
                pk=pk, product__tenant=tenant
            )
        except ProductBatch.DoesNotExist:
            raise NotFound("Batch not found.")

    def get(self, request, pk):
        tenant = get_tenant_from_request(request)
        batch = self._get_batch(pk, tenant)
        return Response({"success": True, "data": ProductBatchSerializer(batch).data})

    def patch(self, request, pk):
        tenant = get_tenant_from_request(request)
        if tenant.business_type == BusinessType.RESTAURANT:
            return Response(
                {"success": False, "message": "Expiry tracking is not available for restaurant businesses."},
                status=status.HTTP_403_FORBIDDEN,
            )
        batch = self._get_batch(pk, tenant)
        serializer = ProductBatchWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        for field in ("quantity", "expiry_date", "batch_number", "notes"):
            if field in vd:
                setattr(batch, field, vd[field])
        batch.save()
        return Response({"success": True, "data": ProductBatchSerializer(batch).data})

    def delete(self, request, pk):
        tenant = get_tenant_from_request(request)
        batch = self._get_batch(pk, tenant)
        batch.delete()
        return Response({"success": True, "message": "Batch deleted."})


class ExpiryAlertsView(APIView):
    """
    GET /api/v1/inventory/expiry-alerts/

    Returns expiring_soon and expired batch lists.
    Shop businesses only — returns empty lists for restaurants.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone
        from apps.notifications.models import NotificationSetting

        tenant = get_tenant_from_request(request)

        if tenant.business_type == BusinessType.RESTAURANT:
            return Response({"success": True, "data": {"expiring_soon": [], "expired": []}})

        today = timezone.now().date()
        try:
            warning_days = int(NotificationSetting.get("expiry_warning_days", "7"))
        except ValueError:
            warning_days = 7
        warning_cutoff = today + timedelta(days=warning_days)

        base_qs = (
            ProductBatch.objects
            .filter(product__tenant=tenant)
            .select_related("product", "shop", "shop__business")
        )

        expiring_soon = base_qs.filter(expiry_date__gte=today, expiry_date__lte=warning_cutoff)
        expired       = base_qs.filter(expiry_date__lt=today)

        return Response({
            "success": True,
            "data": {
                "expiring_soon": ExpiryAlertSerializer(expiring_soon, many=True).data,
                "expired":       ExpiryAlertSerializer(expired,       many=True).data,
            },
        })
