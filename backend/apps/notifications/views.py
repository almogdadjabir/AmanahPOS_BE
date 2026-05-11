"""
Notification and device token views.
"""
import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from .models import DeviceToken, Notification
from .serializers import (
    DeviceRegisterSerializer,
    DeviceTokenSerializer,
    DeviceUnregisterSerializer,
    NotificationSerializer,
    UnreadCountSerializer,
)

logger = logging.getLogger(__name__)


# ── In-app notification endpoints ─────────────────────────────────────────────

class NotificationListView(APIView):
    """
    GET /api/v1/notifications/
    Returns the current user's in-app notification history, newest first.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Notification.objects
            .filter(user=request.user)
            .order_by("-created_at")
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(NotificationSerializer(page, many=True).data)


class NotificationUnreadCountView(APIView):
    """
    GET /api/v1/notifications/unread-count/
    Returns the number of unread in-app notifications for the current user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count})


class NotificationMarkReadView(APIView):
    """
    PATCH /api/v1/notifications/<pk>/read/
    Marks a single notification as read. Returns 404 if it doesn't belong
    to the current user.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        notification.mark_read()
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    """
    POST /api/v1/notifications/mark-all-read/
    Marks all unread notifications as read for the current user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"marked_read": count})


# ── Device token endpoints ────────────────────────────────────────────────────

class DeviceRegisterView(APIView):
    """
    POST /api/v1/notifications/devices/register/

    Register or refresh an FCM device token for the authenticated user.
    If the token already exists (possibly for another user), it is re-assigned
    to the current user and reactivated — this covers the case where a shared
    device re-installs the app.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DeviceRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        device, created = DeviceToken.objects.update_or_create(
            token=vd["token"],
            defaults={
                "user":        request.user,
                "platform":    vd["platform"],
                "device_id":   vd.get("device_id") or "",
                "app_version": vd.get("app_version") or "",
                "is_active":   True,
                "last_seen_at": timezone.now(),
            },
        )

        logger.info(
            "Device token %s for user %s (%s).",
            "registered" if created else "updated",
            request.user.id,
            vd["platform"],
        )

        return Response(
            {"success": True, "created": created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class DeviceUnregisterView(APIView):
    """
    POST /api/v1/notifications/devices/unregister/

    Deactivate an FCM token on logout or explicit opt-out.
    Only deactivates if the token belongs to the current user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DeviceUnregisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated = DeviceToken.objects.filter(
            token=serializer.validated_data["token"],
            user=request.user,
            is_active=True,
        ).update(is_active=False)

        return Response({"success": True, "deactivated": updated > 0})


class DeviceListView(APIView):
    """
    GET /api/v1/notifications/devices/
    Lists the current user's registered device tokens (for debugging).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        devices = DeviceToken.objects.filter(user=request.user).order_by("-updated_at")
        return Response(DeviceTokenSerializer(devices, many=True).data)
