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
from apps.tenants.models import Shop
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
            # Filter where quantity <= min_stock_level
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
