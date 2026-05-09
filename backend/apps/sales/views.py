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
from .models import PaymentMethod, Sale, SaleStatus
from .serializers import (
    CancelSaleSerializer,
    CreateSaleSerializer,
    OfflineSyncRequestSerializer,
    SaleSerializer,
)
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
        from django.db.models import Sum, Count, Avg, Q
        from .models import PaymentMethod

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
            # Cash breakdown
            cash_sales_count=Count("id", filter=Q(payment_method=PaymentMethod.CASH)),
            cash_revenue=Sum("net_amount", filter=Q(payment_method=PaymentMethod.CASH)),
            # Bankak breakdown
            bankak_sales_count=Count("id", filter=Q(payment_method=PaymentMethod.BANKAK)),
            bankak_revenue=Sum("net_amount", filter=Q(payment_method=PaymentMethod.BANKAK)),
        )

        # Per-method breakdown (all methods present in this period)
        payment_breakdown = list(
            qs.values("payment_method")
            .annotate(count=Count("id"), total=Sum("net_amount"))
            .order_by("payment_method")
        )

        response_data = {
            "total_sales": summary["total_sales"] or 0,
            "total_revenue": str(summary["total_revenue"] or 0),
            "total_discount": str(summary["total_discount"] or 0),
            "total_tax": str(summary["total_tax"] or 0),
            "avg_sale_value": str(round(summary["avg_sale_value"] or 0, 2)),
            "cash_sales_count": summary["cash_sales_count"] or 0,
            "total_cash_sales": str(summary["cash_revenue"] or 0),
            "bankak_sales_count": summary["bankak_sales_count"] or 0,
            "total_bankak_sales": str(summary["bankak_revenue"] or 0),
            "payment_breakdown": [
                {
                    "payment_method": row["payment_method"],
                    "count": row["count"],
                    "total": str(row["total"] or 0),
                }
                for row in payment_breakdown
            ],
        }

        if request.query_params.get("breakdown") == "shops":
            shops_rows = list(
                qs.values("shop_id", "shop__name")
                .annotate(count=Count("id"), total=Sum("net_amount"))
                .order_by("-total")
            )
            response_data["shops_breakdown"] = [
                {
                    "shop_id": str(row["shop_id"]),
                    "shop_name": row["shop__name"],
                    "count": row["count"],
                    "total": str(row["total"] or 0),
                }
                for row in shops_rows
            ]

        return Response({"success": True, "data": response_data})


class OfflineSyncView(APIView):
    """
    POST /api/v1/sales/offline-sync/

    Accept a batch of sales made while the device was offline.
    Each sale is processed independently — one failure does not abort others.
    Duplicate client_sale_id values for the same tenant are silently de-duped
    (idempotent: returns the already-created sale instead of creating again).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.utils import timezone

        serializer = OfflineSyncRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        synced_at = timezone.now()
        results = []
        for sale_data in serializer.validated_data["sales"]:
            results.append(
                _sync_one_sale(request, tenant, sale_data, synced_at)
            )

        return Response({"success": True, "results": results})


def _sync_one_sale(request, tenant, sale_data: dict, synced_at) -> dict:
    """
    Process a single offline sale dict.  Returns a result record.
    Never raises — failures are captured as {"status": "failed"}.
    """
    client_sale_id = str(sale_data["client_sale_id"])

    # ── Idempotency: already synced? ──────────────────────────────────────────
    existing = Sale.objects.filter(
        tenant=tenant, client_sale_id=client_sale_id
    ).first()
    if existing:
        return {
            "client_sale_id": client_sale_id,
            "status": "synced",
            "server_sale_id": str(existing.id),
            "message": "Already synced.",
        }

    # ── Resolve shop ──────────────────────────────────────────────────────────
    try:
        shop = Shop.objects.get(pk=sale_data["shop"], business=tenant, is_active=True)
    except Shop.DoesNotExist:
        return _fail(client_sale_id, "Shop not found or does not belong to your business.")

    # ── Resolve optional customer ─────────────────────────────────────────────
    customer = None
    if sale_data.get("customer"):
        try:
            from apps.customers.models import Customer
            customer = Customer.objects.get(pk=sale_data["customer"], tenant=tenant)
        except Customer.DoesNotExist:
            return _fail(client_sale_id, "Customer not found.")

    # ── Build items list ──────────────────────────────────────────────────────
    items = [
        {
            "product_id": str(item["product_id"]),
            "quantity": item["quantity"],
            "unit_price": item.get("unit_price"),
            "discount": item.get("discount", Decimal("0")),
        }
        for item in sale_data["items"]
    ]

    # ── Create sale (each in its own atomic transaction) ──────────────────────
    try:
        sale = create_sale(
            tenant=tenant,
            shop=shop,
            cashier=request.user,
            items=items,
            payment_method=sale_data.get("payment_method", PaymentMethod.CASH),
            customer=customer,
            discount_amount=sale_data.get("discount_amount", Decimal("0")),
            tax_amount=sale_data.get("tax_amount", Decimal("0")),
            notes=sale_data.get("notes", ""),
            client_sale_id=client_sale_id,
            synced_at=synced_at,
        )
        return {
            "client_sale_id": client_sale_id,
            "status": "synced",
            "server_sale_id": str(sale.id),
            "message": None,
        }
    except Exception as exc:
        from apps.core.exceptions import BankakAccountRequiredError, InsufficientStockError
        if isinstance(exc, (BankakAccountRequiredError, InsufficientStockError,
                            BusinessLogicError)):
            return _fail(client_sale_id, str(exc.detail))
        logger.exception("Unexpected error syncing offline sale %s", client_sale_id)
        return _fail(client_sale_id, "An unexpected error occurred. Please retry.")


def _fail(client_sale_id: str, message: str) -> dict:
    return {
        "client_sale_id": client_sale_id,
        "status": "failed",
        "server_sale_id": None,
        "message": message,
    }
