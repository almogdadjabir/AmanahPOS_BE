"""
Admin-only notification management API.
All views require IsAuthenticated + IsAdminUser.
"""
import logging

from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.core.exceptions import NotFound
from .models import (
    NotificationDelivery, NotificationSetting, NotificationTemplate,
)
from .admin_serializers import (
    DeliveryLogSerializer,
    ManualPushSerializer,
    ManualSMSSerializer,
    NotificationSettingSerializer,
    NotificationTemplateSerializer,
    NotificationTemplateWriteSerializer,
)

logger = logging.getLogger(__name__)


class AdminNotifPagination(PageNumberPagination):
    page_size             = 20
    page_size_query_param = "page_size"
    max_page_size         = 100


# ── Templates ─────────────────────────────────────────────────────────────────

class AdminTemplateListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = NotificationTemplate.objects.all()

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(key__icontains=search)

        category = request.query_params.get("category", "").strip()
        if category:
            qs = qs.filter(category=category)

        channel = request.query_params.get("channel", "").strip()
        if channel:
            qs = qs.filter(channel=channel)

        enabled = request.query_params.get("enabled", "").strip()
        if enabled in ("true", "false"):
            qs = qs.filter(is_enabled=(enabled == "true"))

        paginator = AdminNotifPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = NotificationTemplateSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = NotificationTemplateWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        template = serializer.save()
        return Response(
            {"success": True, "data": NotificationTemplateSerializer(template).data},
            status=status.HTTP_201_CREATED,
        )


class AdminTemplateDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def _get(self, pk):
        try:
            return NotificationTemplate.objects.get(pk=pk)
        except NotificationTemplate.DoesNotExist:
            raise NotFound("Template not found.")

    def get(self, request, pk):
        return Response({"success": True, "data": NotificationTemplateSerializer(self._get(pk)).data})

    def patch(self, request, pk):
        tmpl = self._get(pk)
        serializer = NotificationTemplateWriteSerializer(tmpl, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "data": NotificationTemplateSerializer(tmpl).data})

    def delete(self, request, pk):
        self._get(pk).delete()
        return Response({"success": True, "message": "Template deleted."}, status=status.HTTP_200_OK)


class AdminTemplateToggleView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            tmpl = NotificationTemplate.objects.get(pk=pk)
        except NotificationTemplate.DoesNotExist:
            raise NotFound("Template not found.")
        tmpl.is_enabled = not tmpl.is_enabled
        tmpl.save(update_fields=["is_enabled", "updated_at"])
        return Response({"success": True, "data": {"id": str(tmpl.id), "is_enabled": tmpl.is_enabled}})


# ── Settings ──────────────────────────────────────────────────────────────────

class AdminSettingsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        NotificationSetting.ensure_defaults()
        settings_qs = NotificationSetting.objects.all().order_by("key")
        return Response({
            "success": True,
            "data": NotificationSettingSerializer(settings_qs, many=True).data,
        })

    def patch(self, request):
        updates = request.data.get("updates", [])
        if not isinstance(updates, list):
            return Response({"success": False, "message": "updates must be a list."}, status=400)

        for item in updates:
            key   = item.get("key", "").strip()
            value = item.get("value", "")
            if not key:
                continue
            NotificationSetting.objects.filter(key=key).update(value=str(value))

        settings_qs = NotificationSetting.objects.all().order_by("key")
        return Response({
            "success": True,
            "data": NotificationSettingSerializer(settings_qs, many=True).data,
        })


# ── Manual send ───────────────────────────────────────────────────────────────

class AdminSendPushView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = ManualPushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        from apps.accounts.models import CustomUser
        try:
            user = CustomUser.objects.get(pk=vd["user_id"])
        except CustomUser.DoesNotExist:
            raise NotFound("User not found.")

        if not NotificationSetting.get_bool("push_enabled", True):
            return Response(
                {"success": False, "message": "Push notifications are globally disabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if vd.get("template_id"):
            try:
                tmpl = NotificationTemplate.objects.get(pk=vd["template_id"], is_enabled=True)
                rendered = tmpl.render(locale="en")
                title      = rendered["title"]
                body       = rendered["body"]
                notif_type = rendered["notification_type"]
            except NotificationTemplate.DoesNotExist:
                raise NotFound("Template not found or disabled.")
        else:
            title      = vd["title"]
            body       = vd["body"]
            notif_type = "info"

        from apps.notifications.services import notify_user

        notification = notify_user(
            user=user,
            title=title,
            body=body,
            notification_type=notif_type,
            data={"sent_by_admin": True, "admin_id": str(request.user.id)},
        )

        NotificationDelivery.objects.filter(
            notification=notification
        ).update(sent_by_admin=request.user)

        device_count = user.device_tokens.filter(is_active=True).count()
        logger.info(
            "Admin %s manually sent push to user %s (%d devices).",
            request.user.id, user.id, device_count,
        )
        return Response({
            "success": True,
            "message": f"Push notification queued for {device_count} device(s).",
            "data": {"device_count": device_count, "notification_id": str(notification.id)},
        })


class AdminSendSMSView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = ManualSMSSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        from apps.accounts.models import CustomUser
        try:
            user = CustomUser.objects.get(pk=vd["user_id"])
        except CustomUser.DoesNotExist:
            raise NotFound("User not found.")

        if not NotificationSetting.get_bool("sms_enabled", True):
            return Response(
                {"success": False, "message": "SMS notifications are globally disabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if vd.get("template_id"):
            try:
                tmpl = NotificationTemplate.objects.get(pk=vd["template_id"], is_enabled=True)
                rendered = tmpl.render(locale="en")
                message = rendered["body"]
            except NotificationTemplate.DoesNotExist:
                raise NotFound("Template not found or disabled.")
        else:
            message = vd["message"]

        from apps.notifications.tasks import send_sms_task
        send_sms_task.delay(user.phone, message)

        logger.info("Admin %s manually sent SMS to %s.", request.user.id, user.phone)
        return Response({"success": True, "message": f"SMS queued to {user.phone}."})


# ── Delivery logs ─────────────────────────────────────────────────────────────

class AdminDeliveryLogsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = (
            NotificationDelivery.objects
            .select_related("recipient", "notification", "sent_by_admin")
            .order_by("-created_at")
        )

        channel = request.query_params.get("channel", "").strip()
        if channel:
            qs = qs.filter(channel=channel)

        status_filter = request.query_params.get("status", "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)

        from_date = request.query_params.get("from_date", "").strip()
        if from_date:
            qs = qs.filter(created_at__date__gte=from_date)

        to_date = request.query_params.get("to_date", "").strip()
        if to_date:
            qs = qs.filter(created_at__date__lte=to_date)

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(recipient__phone__icontains=search) | \
                 qs.filter(recipient__full_name__icontains=search)

        paginator = AdminNotifPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = DeliveryLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
