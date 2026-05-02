"""
Admin Panel REST API — all endpoints require is_staff=True.

These endpoints are completely separate from the mobile API and will
never clash with tenant-scoped views. All queries are annotated to
avoid N+1 problems and hit only indexed columns.
"""
from datetime import timedelta

from django.db.models import Count, Exists, OuterRef, Prefetch, Q, Subquery, DateField
from django.db.models.functions import TruncMonth
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.accounts.models import CustomUser
from apps.tenants.models import Business, Shop
from apps.subscriptions.models import Subscription

from .serializers import (
    AdminStatsSerializer,
    AdminOwnerSerializer,
    AdminOwnerDetailSerializer,
    AdminOwnerUpdateSerializer,
    AdminBusinessSerializer,
    AdminSubscriptionSerializer,
)


# ── Pagination ────────────────────────────────────────────────────────────────

class AdminPagePagination(PageNumberPagination):
    page_size            = 20
    page_size_query_param = "page_size"
    max_page_size        = 100


# ── Helpers ───────────────────────────────────────────────────────────────────

def _today():
    return timezone.now().date()


def _active_sub_exists(outer_field="pk"):
    """Subquery: does this owner/business have an active, non-expired subscription?"""
    today = _today()
    return Exists(
        Subscription.objects.filter(
            business__owner=OuterRef(outer_field),
            is_active=True,
            end_date__gte=today,
        )
    )


def _active_sub_for_business():
    today = _today()
    return Exists(
        Subscription.objects.filter(
            business=OuterRef("pk"),
            is_active=True,
            end_date__gte=today,
        )
    )


def _latest_sub_end_date():
    """Subquery: latest active subscription end_date for a business."""
    today = _today()
    return Subquery(
        Subscription.objects.filter(
            business=OuterRef("pk"),
            is_active=True,
            end_date__gte=today,
        )
        .order_by("-end_date")
        .values("end_date")[:1],
        output_field=DateField(),
    )


# ── Stats ─────────────────────────────────────────────────────────────────────

class AdminStatsView(APIView):
    """
    GET /api/v1/admin/stats/
    Platform-wide aggregate metrics. Admin-only.
    Runs in 6 focused queries — all on indexed columns.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        today       = _today()
        month_start = today.replace(day=1)
        six_months_ago = today - timedelta(days=180)

        # ── 1. User stats (2 aggregates, 1 query) ────────────────────────────
        owner_qs = CustomUser.objects.filter(is_staff=False, role="owner")
        user_agg = owner_qs.aggregate(
            total=Count("id"),
            new_this_month=Count("id", filter=Q(created_at__date__gte=month_start)),
        )

        # ── 2. Business count ─────────────────────────────────────────────────
        total_businesses = Business.objects.count()

        # ── 3. Shop count ─────────────────────────────────────────────────────
        total_shops = Shop.objects.filter(is_active=True).count()

        # ── 4. Subscription stats (1 query, 2 aggregates) ────────────────────
        sub_agg = Subscription.objects.aggregate(
            active=Count("id", filter=Q(is_active=True, end_date__gte=today)),
            expired=Count("id", filter=Q(is_active=False) | Q(end_date__lt=today)),
        )

        # ── 5. Monthly growth — last 6 months ────────────────────────────────
        monthly_growth = list(
            owner_qs.filter(created_at__date__gte=six_months_ago)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )

        # ── 6. Recent 10 owners ───────────────────────────────────────────────
        recent_owners = list(
            owner_qs.annotate(business_count=Count("businesses", distinct=True))
            .order_by("-created_at")[:10]
        )

        data = {
            "total_owners":          user_agg["total"],
            "total_businesses":      total_businesses,
            "total_shops":           total_shops,
            "active_subscriptions":  sub_agg["active"],
            "expired_subscriptions": sub_agg["expired"],
            "new_owners_this_month": user_agg["new_this_month"],
            "monthly_growth":        monthly_growth,
            "recent_owners":         recent_owners,
        }
        return Response({"success": True, "data": AdminStatsSerializer(data).data})


# ── Owners ────────────────────────────────────────────────────────────────────

class AdminOwnerListView(ListAPIView):
    """
    GET /api/v1/admin/owners/?search=&is_active=&ordering=-created_at
    Paginated, searchable, filterable list of all business owners.
    """
    permission_classes   = [IsAuthenticated, IsAdminUser]
    serializer_class     = AdminOwnerSerializer
    pagination_class     = AdminPagePagination
    filter_backends      = [SearchFilter, OrderingFilter]
    search_fields        = ["full_name", "phone", "email"]
    ordering_fields      = ["created_at", "full_name", "last_login_at"]
    ordering             = ["-created_at"]

    def get_queryset(self):
        today = _today()
        qs = (
            CustomUser.objects.filter(is_staff=False, role="owner")
            .annotate(
                business_count=Count("businesses", distinct=True),
                has_active_subscription=_active_sub_exists("pk"),
            )
        )
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ("true", "1", "yes"))

        has_sub = self.request.query_params.get("has_subscription")
        if has_sub == "true":
            qs = qs.filter(has_active_subscription=True)
        elif has_sub == "false":
            qs = qs.filter(has_active_subscription=False)

        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})


# ── Businesses ────────────────────────────────────────────────────────────────

class AdminBusinessListView(ListAPIView):
    """
    GET /api/v1/admin/businesses/?search=&is_active=&ordering=-created_at
    Paginated, searchable list of all businesses with owner + subscription info.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class   = AdminBusinessSerializer
    pagination_class   = AdminPagePagination
    filter_backends    = [SearchFilter, OrderingFilter]
    search_fields      = ["name", "owner__full_name", "owner__phone"]
    ordering_fields    = ["created_at", "name"]
    ordering           = ["-created_at"]

    def get_queryset(self):
        qs = (
            Business.objects.select_related("owner")
            .annotate(
                shop_count=Count("shops", filter=Q(shops__is_active=True), distinct=True),
                has_active_subscription=_active_sub_for_business(),
                subscription_end_date=_latest_sub_end_date(),
            )
        )
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ("true", "1", "yes"))
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})


# ── Subscriptions ─────────────────────────────────────────────────────────────

class AdminSubscriptionListView(ListAPIView):
    """
    GET /api/v1/admin/subscriptions/?status=active|expired|all&ordering=-created_at
    Paginated list of all subscriptions across all businesses.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class   = AdminSubscriptionSerializer
    pagination_class   = AdminPagePagination
    filter_backends    = [SearchFilter, OrderingFilter]
    search_fields      = ["business__name", "business__owner__full_name", "plan__name"]
    ordering_fields    = ["created_at", "end_date", "start_date"]
    ordering           = ["-created_at"]

    def get_queryset(self):
        today = _today()
        qs = Subscription.objects.select_related("business", "business__owner", "plan")

        status = self.request.query_params.get("status", "all")
        if status == "active":
            qs = qs.filter(is_active=True, end_date__gte=today)
        elif status == "expired":
            qs = qs.filter(Q(is_active=False) | Q(end_date__lt=today))
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})


# ── Owner detail + update ─────────────────────────────────────────────────────

class AdminOwnerDetailView(APIView):
    """
    GET  /api/v1/admin/owners/{pk}/  → full owner profile with nested businesses
    PATCH /api/v1/admin/owners/{pk}/ → update full_name / email
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def _get_owner(self, pk):
        today = _today()
        return get_object_or_404(
            CustomUser.objects.filter(is_staff=False, role="owner")
            .annotate(
                business_count=Count("businesses", distinct=True),
                has_active_subscription=_active_sub_exists("pk"),
            )
            .prefetch_related(
                Prefetch(
                    "businesses",
                    queryset=Business.objects.order_by("name").prefetch_related(
                        Prefetch("shops", queryset=Shop.objects.order_by("name")),
                        Prefetch(
                            "subscriptions",
                            queryset=Subscription.objects.filter(
                                is_active=True, end_date__gte=today
                            ).select_related("plan").order_by("-end_date"),
                        ),
                    ),
                )
            ),
            pk=pk,
        )

    def get(self, request, pk):
        owner = self._get_owner(pk)
        return Response({"success": True, "data": AdminOwnerDetailSerializer(owner).data})

    def patch(self, request, pk):
        owner = self._get_owner(pk)
        serializer = AdminOwnerUpdateSerializer(owner, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "data": AdminOwnerDetailSerializer(self._get_owner(pk)).data})


# ── Owner toggle status ───────────────────────────────────────────────────────

class AdminOwnerToggleStatusView(APIView):
    """
    POST /api/v1/admin/owners/{pk}/toggle-status/
    Activates or deactivates an owner account.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            owner = CustomUser.objects.get(pk=pk, is_staff=False, role="owner")
        except CustomUser.DoesNotExist:
            return Response({"success": False, "message": "Owner not found."}, status=404)

        owner.is_active = not owner.is_active
        owner.save(update_fields=["is_active"])
        label = "activated" if owner.is_active else "deactivated"
        return Response({
            "success": True,
            "message": f"Owner {label} successfully.",
            "data": {"id": str(owner.id), "is_active": owner.is_active},
        })
