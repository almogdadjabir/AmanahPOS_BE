"""
Views for the sales app.
"""
import logging
from decimal import Decimal

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models.user import RoleChoices
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

        # Unified search: receipt_number, customer name, customer phone
        search_q = request.query_params.get("search")
        if search_q:
            from django.db.models import Q
            qs = qs.filter(
                Q(receipt_number__icontains=search_q) |
                Q(customer__name__icontains=search_q) |
                Q(customer__phone__icontains=search_q)
            )

        payment_method = request.query_params.get("payment_method")
        if payment_method:
            qs = qs.filter(payment_method=payment_method)

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


class DashboardSummaryView(APIView):
    """
    GET /api/v1/sales/dashboard-summary/

    Returns today's sales summary, shift data (cashiers only), hourly sparkline,
    and top sellers. 60-second cache keyed per tenant/shop/date/user scope.
    All amounts are float, never null.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):  # noqa: C901
        import zoneinfo
        from datetime import date as date_cls
        from datetime import datetime, timedelta
        from datetime import time as dt_time

        from django.core.cache import cache
        from django.db.models import Count, Min, Q, Sum
        from django.db.models.functions import TruncHour
        from django.utils import timezone as dj_tz

        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response({"success": False, "message": "No active business found."}, status=status.HTTP_400_BAD_REQUEST)

        tz = zoneinfo.ZoneInfo(tenant.timezone)
        now_local = datetime.now(tz)

        # ── Date param ────────────────────────────────────────────────────────
        date_str = request.query_params.get("date")
        if date_str:
            try:
                target_date = date_cls.fromisoformat(date_str)
            except ValueError:
                return Response(
                    {"success": False, "message": "date must be YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if target_date > now_local.date():
                return Response(
                    {"success": False, "message": "date cannot be in the future"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            target_date = now_local.date()

        # ── Shop scoping ──────────────────────────────────────────────────────
        user = request.user
        shop = None

        if user.role == RoleChoices.CASHIER:
            if not user.default_shop_id:
                return Response(
                    {"success": False, "message": "Cashier has no assigned shop"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            shop = user.default_shop
        else:
            shop_id = request.query_params.get("shop_id")
            if shop_id:
                try:
                    shop = Shop.objects.get(pk=shop_id, business=tenant, is_active=True)
                except Shop.DoesNotExist:
                    raise NotFound("Shop not found.")

        # ── top_sellers_limit ─────────────────────────────────────────────────
        try:
            limit = int(request.query_params.get("top_sellers_limit", 5))
        except (ValueError, TypeError):
            limit = 5
        limit = min(max(limit, 1), 20)

        # ── Cache ─────────────────────────────────────────────────────────────
        cashier_scope = str(user.id) if user.role == RoleChoices.CASHIER else "any"
        cache_key = (
            f"dsb:{tenant.id}:{shop.id if shop else 'all'}:"
            f"{target_date}:{user.role}:{cashier_scope}:{limit}"
        )
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        # ── UTC range (index-friendly) ────────────────────────────────────────
        local_start = datetime.combine(target_date, dt_time.min).replace(tzinfo=tz)
        start_utc = local_start.astimezone(zoneinfo.ZoneInfo("UTC"))
        end_utc = start_utc + timedelta(days=1)

        # ── Base filter dict (reused across queries) ──────────────────────────
        base_filter = {
            "tenant": tenant,
            "status": SaleStatus.COMPLETED,
            "created_at__gte": start_utc,
            "created_at__lt": end_utc,
        }
        if shop:
            base_filter["shop"] = shop
        base_qs = Sale.objects.filter(**base_filter)

        # ── Query 1: today aggregates ─────────────────────────────────────────
        today_agg = base_qs.aggregate(
            gross=Sum("total_amount"),
            sales_count=Count("id"),
            cash=Sum("total_amount", filter=Q(payment_method=PaymentMethod.CASH)),
            bankak=Sum("total_amount", filter=Q(payment_method=PaymentMethod.BANKAK)),
        )

        # ── Query 2: refunds (separate status filter) ─────────────────────────
        refund_filter = {
            "tenant": tenant,
            "status__in": [SaleStatus.REFUNDED, SaleStatus.PARTIAL_REFUND],
            "created_at__gte": start_utc,
            "created_at__lt": end_utc,
        }
        if shop:
            refund_filter["shop"] = shop
        refund_agg = Sale.objects.filter(**refund_filter).aggregate(
            refund_amount=Sum("total_amount"),
            refund_count=Count("id"),
        )

        gross = float(today_agg["gross"] or 0)
        sales_count = today_agg["sales_count"] or 0
        refund_amount = float(refund_agg["refund_amount"] or 0)
        refund_count = refund_agg["refund_count"] or 0
        avg_sale = round(gross / sales_count, 2) if sales_count > 0 else 0.0

        # ── Query 3: shift (cashier only) ─────────────────────────────────────
        shift_data = {
            "cashier_id": None,
            "cashier_name": None,
            "shift_started_at": None,
            "gross_sales_amount": 0.0,
            "sales_count": 0,
            "average_sale_amount": 0.0,
        }
        if user.role == RoleChoices.CASHIER:
            shift_agg = base_qs.filter(cashier=user).aggregate(
                started_at=Min("created_at"),
                gross=Sum("total_amount"),
                count=Count("id"),
            )
            shift_gross = float(shift_agg["gross"] or 0)
            shift_count = shift_agg["count"] or 0
            shift_data = {
                "cashier_id": str(user.id),
                "cashier_name": user.full_name,
                "shift_started_at": (
                    shift_agg["started_at"].isoformat()
                    if shift_agg["started_at"] else None
                ),
                "gross_sales_amount": shift_gross,
                "sales_count": shift_count,
                "average_sale_amount": (
                    round(shift_gross / shift_count, 2) if shift_count > 0 else 0.0
                ),
            }

        # ── Query 4: hourly sparkline (zero-filled) ───────────────────────────
        is_today = target_date == now_local.date()
        max_hour = now_local.hour if is_today else 23

        hourly_rows = (
            base_qs
            .annotate(hour=TruncHour("created_at"))
            .values("hour")
            .annotate(amount=Sum("total_amount"), count=Count("id"))
            .order_by("hour")
        )
        hourly_map = {}
        for row in hourly_rows:
            h = row["hour"].astimezone(tz).hour
            hourly_map[h] = {
                "amount": float(row["amount"] or 0),
                "sales_count": row["count"] or 0,
            }

        sparkline_points = [
            {
                "label": f"{h:02d}:00",
                "amount": hourly_map.get(h, {}).get("amount", 0.0),
                "sales_count": hourly_map.get(h, {}).get("sales_count", 0),
            }
            for h in range(0, max_hour + 1)
        ]

        # ── Query 5: top sellers ──────────────────────────────────────────────
        from apps.core.image_service import build_image_url
        from apps.products.models import Product
        from apps.sales.models import SaleItem

        item_filter = {
            "sale__tenant": tenant,
            "sale__status": SaleStatus.COMPLETED,
            "sale__created_at__gte": start_utc,
            "sale__created_at__lt": end_utc,
        }
        if shop:
            item_filter["sale__shop"] = shop

        top_rows = list(
            SaleItem.objects.filter(**item_filter)
            .values("product_id")
            .annotate(quantity_sold=Sum("quantity"), gross_amount=Sum("subtotal"))
            .order_by("-quantity_sold")[:limit]
        )

        product_ids = [r["product_id"] for r in top_rows]
        products_map = {p.id: p for p in Product.objects.filter(id__in=product_ids, tenant=tenant)}

        top_sellers = [
            {
                "product_id": str(r["product_id"]),
                "name": products_map[r["product_id"]].name,
                "quantity_sold": float(r["quantity_sold"] or 0),
                "gross_amount": float(r["gross_amount"] or 0),
                "thumbnail_url": build_image_url(
                    products_map[r["product_id"]].thumbnail,
                    request=request,
                    version=(
                        int(products_map[r["product_id"]].updated_at.timestamp())
                        if products_map[r["product_id"]].updated_at else None
                    ),
                ),
            }
            for r in top_rows
            if r["product_id"] in products_map
        ]

        # ── Assemble response ─────────────────────────────────────────────────
        now_utc = dj_tz.now()
        response_data = {
            "success": True,
            "server_time": now_utc.isoformat(),
            "timezone": tenant.timezone,
            "currency": tenant.currency,
            "scope": {
                "business_id": str(tenant.id),
                "shop_id": str(shop.id) if shop else None,
                "shop_name": shop.name if shop else None,
            },
            "today": {
                "date": str(target_date),
                "gross_sales_amount": gross,
                "net_sales_amount": round(gross - refund_amount, 2),
                "sales_count": sales_count,
                "average_sale_amount": avg_sale,
                "refund_amount": refund_amount,
                "refund_count": refund_count,
                "cash_amount": float(today_agg["cash"] or 0),
                "bankak_amount": float(today_agg["bankak"] or 0),
            },
            "shift": shift_data,
            "sparkline": {
                "interval": "hour",
                "points": sparkline_points,
            },
            "top_sellers": top_sellers,
            "sync": {
                "includes_pending_offline_sales": False,
                "last_calculated_at": now_utc.isoformat(),
            },
        }

        cache.set(cache_key, response_data, 60)
        return Response(response_data)
