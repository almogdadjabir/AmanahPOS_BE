"""
Views for the sales app.
"""
import logging
from decimal import Decimal

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import BusinessLogicError, NotFound
from apps.core.pagination import StandardPagination
from apps.products.services import get_tenant_from_request
from apps.tenants.models import Shop
from .models import Sale, SaleStatus
from .serializers import CancelSaleSerializer, CreateSaleSerializer, SaleSerializer
from .services import cancel_sale, create_sale

logger = logging.getLogger(__name__)


class SaleListCreateView(APIView):
    """
    GET  /api/v1/sales/
    POST /api/v1/sales/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        qs = Sale.objects.filter(
            tenant=tenant
        ).select_related(
            "shop", "cashier", "customer"
        ).prefetch_related("items__product")

        # Filters
        shop_id = request.query_params.get("shop")
        if shop_id:
            qs = qs.filter(shop_id=shop_id)

        sale_status = request.query_params.get("status")
        if sale_status:
            qs = qs.filter(status=sale_status)

        cashier_id = request.query_params.get("cashier")
        if cashier_id:
            qs = qs.filter(cashier_id=cashier_id)

        receipt = request.query_params.get("receipt")
        if receipt:
            qs = qs.filter(receipt_number__icontains=receipt)

        date_from = request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = SaleSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        serializer = CreateSaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            shop = Shop.objects.get(pk=data["shop"], business=tenant, is_active=True)
        except Shop.DoesNotExist:
            raise NotFound("Shop not found.")

        customer = None
        if data.get("customer"):
            try:
                from apps.customers.models import Customer
                customer = Customer.objects.get(pk=data["customer"], tenant=tenant)
            except Exception:
                raise NotFound("Customer not found.")

        sale = create_sale(
            tenant=tenant,
            shop=shop,
            cashier=request.user,
            items=data["items"],
            payment_method=data["payment_method"],
            customer=customer,
            discount_amount=data.get("discount_amount", Decimal("0")),
            tax_amount=data.get("tax_amount", Decimal("0")),
            notes=data.get("notes", ""),
        )

        return Response(
            {
                "success": True,
                "message": "Sale created successfully.",
                "data": SaleSerializer(sale).data,
            },
            status=status.HTTP_201_CREATED,
        )


class SaleDetailView(APIView):
    """
    GET    /api/v1/sales/<id>/
    """
    permission_classes = [IsAuthenticated]

    def get_sale(self, pk):
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            raise BusinessLogicError("No active business found.")
        try:
            return Sale.objects.select_related(
                "shop", "cashier", "customer"
            ).prefetch_related("items__product").get(pk=pk, tenant=tenant)
        except Sale.DoesNotExist:
            raise NotFound("Sale not found.")

    def get(self, request, pk):
        sale = self.get_sale(pk)
        return Response({"success": True, "data": SaleSerializer(sale).data})


class SaleCancelView(APIView):
    """
    POST /api/v1/sales/<id>/cancel/
    Cancel a sale and restore inventory.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        try:
            sale = Sale.objects.get(pk=pk, tenant=tenant)
        except Sale.DoesNotExist:
            raise NotFound("Sale not found.")

        serializer = CancelSaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_sale = cancel_sale(
            sale=sale,
            reason=serializer.validated_data.get("reason", ""),
            cancelled_by=request.user,
        )
        return Response(
            {
                "success": True,
                "message": "Sale cancelled and inventory restored.",
                "data": SaleSerializer(updated_sale).data,
            }
        )


class SalesSummaryView(APIView):
    """
    GET /api/v1/sales/summary/
    Return aggregate sales totals for a shop/date range.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum, Count, Avg

        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        qs = Sale.objects.filter(tenant=tenant, status=SaleStatus.COMPLETED)

        shop_id = request.query_params.get("shop")
        if shop_id:
            qs = qs.filter(shop_id=shop_id)

        date_from = request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        summary = qs.aggregate(
            total_sales=Count("id"),
            total_revenue=Sum("net_amount"),
            total_discount=Sum("discount_amount"),
            total_tax=Sum("tax_amount"),
            avg_sale_value=Avg("net_amount"),
        )

        return Response({
            "success": True,
            "data": {
                "total_sales": summary["total_sales"] or 0,
                "total_revenue": str(summary["total_revenue"] or 0),
                "total_discount": str(summary["total_discount"] or 0),
                "total_tax": str(summary["total_tax"] or 0),
                "avg_sale_value": str(round(summary["avg_sale_value"] or 0, 2)),
            }
        })
