"""
Views for the subscriptions app.
"""
import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import NotFound, BusinessLogicError
from apps.core.permissions import IsOwner
from apps.products.services import get_tenant_from_request
from .models import Plan, Subscription
from .serializers import PlanSerializer, SubscribeSerializer, SubscriptionSerializer

logger = logging.getLogger(__name__)


class PlanListView(APIView):
    """
    GET /api/v1/subscriptions/plans/
    List all available subscription plans (public).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        plans = Plan.objects.filter(is_active=True).order_by("sort_order", "price")
        serializer = PlanSerializer(plans, many=True)
        return Response({"success": True, "data": serializer.data})


class SubscriptionListView(APIView):
    """
    GET /api/v1/subscriptions/
    List all subscriptions for the current tenant.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        subscriptions = Subscription.objects.filter(
            business=tenant
        ).select_related("plan").order_by("-created_at")

        serializer = SubscriptionSerializer(subscriptions, many=True)
        return Response({"success": True, "data": serializer.data})


class SubscribeView(APIView):
    """
    POST /api/v1/subscriptions/subscribe/
    Subscribe the current tenant to a plan.
    """
    permission_classes = [IsAuthenticated, IsOwner]

    def post(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        serializer = SubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        plan = Plan.objects.get(pk=data["plan_id"])

        # Deactivate existing active subscriptions
        Subscription.objects.filter(
            business=tenant, is_active=True
        ).update(is_active=False)

        # Create new subscription
        start_date = timezone.now().date()
        end_date = start_date + timedelta(days=plan.duration_days)

        subscription = Subscription.objects.create(
            business=tenant,
            plan=plan,
            start_date=start_date,
            end_date=end_date,
            is_active=True,
            payment_reference=data.get("payment_reference", ""),
        )

        # Update business's subscription plan
        tenant.subscription_plan = plan
        tenant.save(update_fields=["subscription_plan", "updated_at"])

        logger.info("Business %s subscribed to plan %s", tenant.id, plan.name)

        return Response(
            {
                "success": True,
                "message": f"Successfully subscribed to '{plan.name}' plan.",
                "data": SubscriptionSerializer(subscription).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CurrentSubscriptionView(APIView):
    """
    GET /api/v1/subscriptions/current/
    Get the current active subscription.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        subscription = Subscription.objects.filter(
            business=tenant, is_active=True
        ).select_related("plan").first()

        if not subscription:
            return Response(
                {"success": True, "data": None, "message": "No active subscription found."}
            )

        return Response({"success": True, "data": SubscriptionSerializer(subscription).data})
