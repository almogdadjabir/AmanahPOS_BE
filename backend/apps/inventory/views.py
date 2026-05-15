"""
Views for the inventory app.
"""
import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import NotFound, BusinessLogicError, SubscriptionLimitError
from apps.core.pagination import StandardPagination
from apps.core.permissions import IsManagerOrAbove
from apps.products.models import Product
from apps.products.services import get_tenant_from_request
from apps.tenants.models import BusinessType, Shop
from datetime import date, timedelta
from decimal import Decimal as D

from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from .models import InboundTransaction, InboundTransactionItem, ProductBatch, StockLevel, StockMovement, Vendor
from .serializers import (
    ExpiryAlertSerializer,
    ExpiryBatchSerializer,
    InboundReceiveSerializer,
    InboundTransactionSerializer,
    ProductBatchSerializer,
    ProductBatchWriteSerializer,
    StockAdjustmentSerializer,
    StockLevelSerializer,
    StockMovementCreateSerializer,
    StockMovementSerializer,
    StockTransferSerializer,
    VendorCreateUpdateSerializer,
    VendorSerializer,
)
from .services import add_stock, adjust_stock, deduct_stock, inbound_receive, transfer_stock

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

        # If expiry_date is provided, also create a ProductBatch for expiry tracking.
        expiry_date = data.get("expiry_date")
        if expiry_date and tenant.business_type != BusinessType.RESTAURANT:
            ProductBatch.objects.create(
                product=product,
                shop=shop,
                quantity=data["quantity"],
                expiry_date=expiry_date,
                batch_number=data.get("batch_number", ""),
                notes=data.get("notes", ""),
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



class InboundReceiveView(APIView):
    """
    GET  /api/v1/inventory/inbound/  → paginated list of inbound transactions
    POST /api/v1/inventory/inbound/  → record a new stock delivery

    Feature-gated: inventory_inbound_receiving.
    SHOP businesses only. Owner and manager roles only.
    """
    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    # ── GET: list ─────────────────────────────────────────────────────────────

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = (
            InboundTransaction.objects
            .filter(tenant=tenant)
            .select_related("shop", "vendor", "created_by")
            .prefetch_related("items__product")
        )

        # ── Filters ────────────────────────────────────────────────────────────
        params = request.query_params

        if vendor_id := params.get("vendor_id"):
            qs = qs.filter(vendor_id=vendor_id)

        if shop_id := params.get("shop_id"):
            qs = qs.filter(shop_id=shop_id)

        if reference := params.get("reference"):
            qs = qs.filter(reference__icontains=reference)

        if date_from := params.get("date_from"):
            qs = qs.filter(created_at__date__gte=date_from)

        if date_to := params.get("date_to"):
            qs = qs.filter(created_at__date__lte=date_to)

        if product_id := params.get("product_id"):
            qs = qs.filter(items__product_id=product_id).distinct()

        if search := params.get("search"):
            qs = qs.filter(
                Q(reference__icontains=search) | Q(vendor__name__icontains=search)
            )

        qs = qs.order_by("-created_at")

        paginator = StandardPagination()
        page      = paginator.paginate_queryset(qs, request)
        serializer = InboundTransactionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    # ── POST: create ───────────────────────────────────────────────────────────

    def post(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if tenant.business_type == BusinessType.RESTAURANT:
            return Response(
                {"success": False, "message": "Inventory management is not available for restaurant businesses."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = tenant.subscription_plan
        if plan is None or not plan.has_feature("inventory_inbound_receiving"):
            raise SubscriptionLimitError(
                "Your plan does not include Inbound Stock Receiving. "
                "Upgrade your subscription to access this feature.",
                code="FEATURE_NOT_INCLUDED",
            )

        serializer = InboundReceiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # ── Resolve shop ───────────────────────────────────────────────────────
        try:
            shop = Shop.objects.get(pk=data["shop_id"], business=tenant)
        except Shop.DoesNotExist:
            raise NotFound("Shop not found.")

        # ── Resolve vendor (must be active and belong to this tenant) ──────────
        try:
            vendor = Vendor.objects.get(pk=data["vendor_id"], tenant=tenant)
        except Vendor.DoesNotExist:
            raise NotFound("Vendor not found.")

        if not vendor.is_active:
            return Response(
                {"success": False, "message": "The selected vendor is inactive. Please choose an active vendor."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Resolve products (tenant-scoped) ───────────────────────────────────
        resolved_items = []
        for item in data["items"]:
            try:
                product = Product.objects.get(pk=item["product_id"], tenant=tenant)
            except Product.DoesNotExist:
                return Response(
                    {"success": False, "message": f"Product {item['product_id']} not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            resolved_items.append({
                "product":      product,
                "quantity":     item["quantity"],
                "unit_cost":    item.get("unit_cost"),
                "expiry_date":  item.get("expiry_date"),
                "batch_number": item.get("batch_number", ""),
            })

        try:
            txn = inbound_receive(
                tenant=tenant,
                shop=shop,
                vendor=vendor,
                reference=data["reference"],
                items=resolved_items,
                created_by=request.user,
                notes=data.get("notes", ""),
            )
        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"success": True, "data": InboundTransactionSerializer(txn).data},
            status=status.HTTP_201_CREATED,
        )


# ── Vendor CRUD ───────────────────────────────────────────────────────────────

class VendorListCreateView(APIView):
    """
    GET  /api/v1/inventory/vendors/  → paginated vendor list
    POST /api/v1/inventory/vendors/  → create vendor

    Query params (GET):
      search    — name, phone, or email (case-insensitive)
      is_active — true | false
    """
    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = Vendor.objects.filter(tenant=tenant)

        params = request.query_params

        if (is_active := params.get("is_active")) is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        if search := params.get("search"):
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
            )

        paginator  = StandardPagination()
        page       = paginator.paginate_queryset(qs, request)
        serializer = VendorSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = VendorCreateUpdateSerializer(
            data=request.data,
            context={"tenant": tenant},
        )
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save(tenant=tenant)
        return Response(
            {"success": True, "data": VendorSerializer(vendor).data},
            status=status.HTTP_201_CREATED,
        )


class VendorDetailView(APIView):
    """
    GET    /api/v1/inventory/vendors/<pk>/
    PATCH  /api/v1/inventory/vendors/<pk>/
    DELETE /api/v1/inventory/vendors/<pk>/  → soft-delete (is_active=False)
    """
    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    def _get_vendor(self, pk, tenant) -> Vendor:
        from django.shortcuts import get_object_or_404
        return get_object_or_404(Vendor, pk=pk, tenant=tenant)

    def _get_tenant(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            return None, Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return tenant, None

    def get(self, request, pk):
        tenant, err = self._get_tenant(request)
        if err:
            return err
        vendor = self._get_vendor(pk, tenant)
        return Response({"success": True, "data": VendorSerializer(vendor).data})

    def patch(self, request, pk):
        tenant, err = self._get_tenant(request)
        if err:
            return err
        vendor     = self._get_vendor(pk, tenant)
        serializer = VendorCreateUpdateSerializer(
            vendor,
            data=request.data,
            partial=True,
            context={"tenant": tenant},
        )
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()
        return Response({"success": True, "data": VendorSerializer(vendor).data})

    def delete(self, request, pk):
        tenant, err = self._get_tenant(request)
        if err:
            return err
        vendor = self._get_vendor(pk, tenant)
        vendor.is_active = False
        vendor.save(update_fields=["is_active", "updated_at"])
        return Response({"success": True})


# ── Vendor inbound summary ────────────────────────────────────────────────────

class InboundVendorSummaryView(APIView):
    """
    GET /api/v1/inventory/inbound/vendor-summary/

    Aggregated inbound stats grouped by vendor.

    Query params: vendor_id, shop_id, date_from, date_to
    """
    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        from decimal import Decimal as D

        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs     = InboundTransaction.objects.filter(tenant=tenant)
        params = request.query_params

        if vendor_id := params.get("vendor_id"):
            qs = qs.filter(vendor_id=vendor_id)

        if shop_id := params.get("shop_id"):
            qs = qs.filter(shop_id=shop_id)

        if date_from := params.get("date_from"):
            qs = qs.filter(created_at__date__gte=date_from)

        if date_to := params.get("date_to"):
            qs = qs.filter(created_at__date__lte=date_to)

        total_transactions = qs.count()
        total_quantity = (
            InboundTransactionItem.objects
            .filter(transaction__in=qs)
            .aggregate(total=Sum("quantity"))["total"] or D("0")
        )

        vendor_rows = (
            qs.filter(vendor__isnull=False)
            .values("vendor_id", "vendor__name")
            .annotate(
                transactions_count=Count("id"),
                total_quantity=Sum("items__quantity"),
            )
            .order_by("-transactions_count")
        )

        return Response({
            "success": True,
            "data": {
                "total_transactions": total_transactions,
                "total_quantity":     str(total_quantity),
                "vendors": [
                    {
                        "vendor_id":          str(row["vendor_id"]),
                        "vendor_name":         row["vendor__name"],
                        "transactions_count":  row["transactions_count"],
                        "total_quantity":      str(row["total_quantity"] or D("0")),
                    }
                    for row in vendor_rows
                ],
            },
        })


# ── Premium summary ───────────────────────────────────────────────────────────

class PremiumSummaryView(APIView):
    """
    GET /api/v1/inventory/premium-summary/

    Feature-gated KPI summary for the premium inventory dashboard.
    Query param: shop_id (optional) — scopes stock/batch/inbound counts to one shop.
    """
    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = tenant.subscription_plan
        if plan is None or not plan.has_feature("inventory_inbound_receiving"):
            raise SubscriptionLimitError(
                "Your plan does not include Premium Inventory.",
                code="FEATURE_NOT_INCLUDED",
            )

        shop_id     = request.query_params.get("shop_id")
        today       = date.today()
        expiry_soon = today + timedelta(days=30)
        now         = timezone.now()

        sl_qs      = StockLevel.objects.filter(shop__business=tenant)
        batch_qs   = ProductBatch.objects.filter(shop__business=tenant)
        inbound_qs = InboundTransaction.objects.filter(tenant=tenant)

        if shop_id:
            sl_qs      = sl_qs.filter(shop_id=shop_id)
            batch_qs   = batch_qs.filter(shop_id=shop_id)
            inbound_qs = inbound_qs.filter(shop_id=shop_id)

        stock_items_count  = sl_qs.count()
        low_stock_count    = sl_qs.filter(
            quantity__gt=0,
            quantity__lte=F("product__min_stock_level"),
        ).count()
        out_of_stock_count = sl_qs.filter(quantity__lte=0).count()

        expiring_soon_count = batch_qs.filter(
            expiry_date__gte=today,
            expiry_date__lte=expiry_soon,
        ).count()
        expired_count = batch_qs.filter(expiry_date__lt=today).count()

        active_vendors_count = Vendor.objects.filter(
            tenant=tenant, is_active=True,
        ).count()

        inbound_month_qs = inbound_qs.filter(
            created_at__year=now.year,
            created_at__month=now.month,
        )
        inbound_this_month_count = inbound_month_qs.count()
        received_qty = (
            InboundTransactionItem.objects
            .filter(transaction__in=inbound_month_qs)
            .aggregate(total=Sum("quantity"))["total"] or D("0")
        )

        return Response({
            "success": True,
            "data": {
                "stock_items_count":            stock_items_count,
                "low_stock_count":              low_stock_count,
                "out_of_stock_count":           out_of_stock_count,
                "expiring_soon_count":          expiring_soon_count,
                "expired_count":                expired_count,
                "active_vendors_count":         active_vendors_count,
                "inbound_this_month_count":     inbound_this_month_count,
                "received_quantity_this_month": str(received_qty),
            },
        })


# ── Inbound transaction detail ────────────────────────────────────────────────

class InboundDetailView(APIView):
    """
    GET /api/v1/inventory/inbound/<uuid:pk>/

    Feature-gated. Returns full inbound transaction with items, vendor,
    shop, and created_by_name.
    """
    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    def get(self, request, pk):
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = tenant.subscription_plan
        if plan is None or not plan.has_feature("inventory_inbound_receiving"):
            raise SubscriptionLimitError(
                "Your plan does not include Premium Inventory.",
                code="FEATURE_NOT_INCLUDED",
            )

        try:
            txn = (
                InboundTransaction.objects
                .select_related("vendor", "shop", "created_by")
                .prefetch_related("items__product")
                .get(pk=pk, tenant=tenant)
            )
        except InboundTransaction.DoesNotExist:
            raise NotFound("Inbound transaction not found.")

        return Response({
            "success": True,
            "data": InboundTransactionSerializer(txn).data,
        })


# ── Expiry report ─────────────────────────────────────────────────────────────

class ExpiryReportView(APIView):
    """
    GET /api/v1/inventory/reports/expiry/

    Feature-gated paginated expiry report.

    Query params:
      status      — expiring_soon | expired | all (default)
      shop_id     — filter by shop
      vendor_id   — filter by vendor (approximate: products supplied by vendor)
      date_from   — expiry_date >=
      date_to     — expiry_date <=
      search      — product name or batch number
    """
    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = tenant.subscription_plan
        if plan is None or not plan.has_feature("inventory_inbound_receiving"):
            raise SubscriptionLimitError(
                "Your plan does not include Premium Inventory.",
                code="FEATURE_NOT_INCLUDED",
            )

        qs = (
            ProductBatch.objects
            .filter(shop__business=tenant)
            .select_related("product", "shop")
            .order_by("expiry_date")
        )

        params = request.query_params
        today  = date.today()

        status_filter = params.get("status", "all")
        if status_filter == "expiring_soon":
            qs = qs.filter(expiry_date__gte=today, expiry_date__lte=today + timedelta(days=30))
        elif status_filter == "expired":
            qs = qs.filter(expiry_date__lt=today)

        if shop_id := params.get("shop_id"):
            qs = qs.filter(shop_id=shop_id)

        if date_from := params.get("date_from"):
            qs = qs.filter(expiry_date__gte=date_from)

        if date_to := params.get("date_to"):
            qs = qs.filter(expiry_date__lte=date_to)

        if vendor_id := params.get("vendor_id"):
            supplied = (
                InboundTransactionItem.objects
                .filter(transaction__vendor_id=vendor_id, transaction__tenant=tenant)
                .values_list("product_id", flat=True)
                .distinct()
            )
            qs = qs.filter(product__in=supplied)

        if search := params.get("search"):
            qs = qs.filter(
                Q(product__name__icontains=search) | Q(batch_number__icontains=search)
            )

        paginator  = StandardPagination()
        page       = paginator.paginate_queryset(qs, request)
        serializer = ExpiryBatchSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
