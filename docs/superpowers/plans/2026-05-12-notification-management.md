# Notification Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete admin Notification & SMS Management section — DB-backed templates, global settings, manual push/SMS sender, and delivery logs — fully wired to real APIs.

**Architecture:** New `NotificationTemplate` and `NotificationSetting` Django models back all admin-facing endpoints under `/api/v1/admin/notifications/`. The Next.js admin adds a top-level `/notifications` section with four sub-pages (Templates, Sender, Logs, Settings) sharing a tab layout. All strings are in the translation files; all data comes from real APIs.

**Tech Stack:** Django 5 + DRF, Celery, Firebase Admin SDK, Next.js 14 App Router, Tailwind CSS, next-intl, Lucide icons.

---

## File Map

### Backend — new files
| Path | Responsibility |
|------|---------------|
| `backend/apps/notifications/models/template.py` | `NotificationTemplate` model |
| `backend/apps/notifications/models/setting.py` | `NotificationSetting` key-value model |
| `backend/apps/notifications/migrations/0004_notificationtemplate_notificationsetting.py` | Schema migration |
| `backend/apps/notifications/migrations/0005_notificationdelivery_sent_by_admin.py` | Add `sent_by_admin` FK to delivery |
| `backend/apps/notifications/admin_serializers.py` | DRF serializers for admin endpoints |
| `backend/apps/notifications/admin_views.py` | All admin notification API views |
| `backend/apps/notifications/admin_urls.py` | URL patterns for admin notification API |

### Backend — modified files
| Path | Change |
|------|--------|
| `backend/apps/notifications/models/__init__.py` | Export new models |
| `backend/apps/notifications/models/delivery.py` | Add `sent_by_admin` FK |
| `backend/apps/admin_panel/urls.py` | Include `notifications/` admin URLs |

### Frontend — new files
| Path | Responsibility |
|------|---------------|
| `admin/src/services/notifications.ts` | All admin notification API calls |
| `admin/src/app/[locale]/(dashboard)/notifications/layout.tsx` | Section layout with tab nav |
| `admin/src/app/[locale]/(dashboard)/notifications/page.tsx` | Redirect → templates |
| `admin/src/app/[locale]/(dashboard)/notifications/templates/page.tsx` | Template list (server) |
| `admin/src/app/[locale]/(dashboard)/notifications/templates/new/page.tsx` | Create template |
| `admin/src/app/[locale]/(dashboard)/notifications/templates/[id]/edit/page.tsx` | Edit template |
| `admin/src/app/[locale]/(dashboard)/notifications/templates/_components/TemplatesList.tsx` | Table + actions |
| `admin/src/app/[locale]/(dashboard)/notifications/templates/_components/TemplateForm.tsx` | Create/edit form |
| `admin/src/app/[locale]/(dashboard)/notifications/sender/page.tsx` | Sender page (server shell) |
| `admin/src/app/[locale]/(dashboard)/notifications/sender/_components/PushSenderForm.tsx` | Push sender form |
| `admin/src/app/[locale]/(dashboard)/notifications/sender/_components/UserSearchSelector.tsx` | Debounced user search |
| `admin/src/app/[locale]/(dashboard)/notifications/logs/page.tsx` | Delivery logs (server) |
| `admin/src/app/[locale]/(dashboard)/notifications/logs/_components/LogsTable.tsx` | Paginated table |
| `admin/src/app/[locale]/(dashboard)/notifications/settings/page.tsx` | Settings page (server) |
| `admin/src/app/[locale]/(dashboard)/notifications/settings/_components/SettingsPanel.tsx` | Toggle + value cards |

### Frontend — modified files
| Path | Change |
|------|--------|
| `admin/src/lib/api.ts` | Add `apiDelete` |
| `admin/src/lib/cacheTags.ts` | Add `notifications` tag |
| `admin/src/types/api.ts` | Add notification types |
| `admin/src/components/layout/Sidebar.tsx` | Add notifications nav item |
| `admin/src/components/layout/AppShell.tsx` | Add notifications to PAGE_TITLES + adminTitles |
| `admin/src/messages/en.json` | Add notification section translations |
| `admin/src/messages/ar.json` | Add notification section translations |

---

## Task 1: Backend — NotificationTemplate + NotificationSetting models

**Files:**
- Create: `backend/apps/notifications/models/template.py`
- Create: `backend/apps/notifications/models/setting.py`
- Modify: `backend/apps/notifications/models/__init__.py`

- [ ] **Step 1: Create `template.py`**

```python
# backend/apps/notifications/models/template.py
import uuid
from django.db import models


class NotificationTemplate(models.Model):
    class Channel(models.TextChoices):
        PUSH = "push", "Push"
        SMS  = "sms",  "SMS"
        BOTH = "both", "Both"

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key        = models.CharField(max_length=100, unique=True)
    name       = models.CharField(max_length=200)
    category   = models.CharField(max_length=50, db_index=True)
    channel    = models.CharField(max_length=10, choices=Channel.choices, default=Channel.PUSH)
    title_en   = models.CharField(max_length=255)
    body_en    = models.TextField()
    title_ar   = models.CharField(max_length=255)
    body_ar    = models.TextField()
    variables  = models.JSONField(default=list, blank=True)
    is_enabled = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notifications_templates"
        verbose_name = "Notification Template"
        verbose_name_plural = "Notification Templates"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.key} [{self.channel}]"

    def render(self, locale: str = "en", **kwargs) -> dict:
        """Return rendered title/body for the given locale."""
        if locale == "ar":
            title = self.title_ar or self.title_en
            body  = self.body_ar  or self.body_en
        else:
            title = self.title_en
            body  = self.body_en
        return {
            "title": title.format(**kwargs) if kwargs else title,
            "body":  body.format(**kwargs)  if kwargs else body,
            "notification_type": self.category,
        }
```

- [ ] **Step 2: Create `setting.py`**

```python
# backend/apps/notifications/models/setting.py
from django.db import models


class NotificationSetting(models.Model):
    key         = models.CharField(max_length=100, primary_key=True)
    value       = models.TextField()
    description = models.CharField(max_length=500, blank=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notifications_settings"
        verbose_name = "Notification Setting"
        verbose_name_plural = "Notification Settings"

    def __str__(self):
        return f"{self.key}={self.value}"

    @classmethod
    def get(cls, key: str, default: str = "") -> str:
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default

    @classmethod
    def get_bool(cls, key: str, default: bool = True) -> bool:
        return cls.get(key, str(default)).lower() in ("true", "1", "yes")

    @classmethod
    def ensure_defaults(cls) -> None:
        """Seed default settings if they don't exist."""
        defaults = [
            ("push_enabled",    "true",  "Enable/disable all push notifications globally"),
            ("sms_enabled",     "true",  "Enable/disable all SMS notifications globally"),
            ("push_daily_limit","1000",  "Max push notifications sent per day"),
            ("sms_daily_limit", "500",   "Max SMS messages sent per day"),
        ]
        for key, value, description in defaults:
            cls.objects.get_or_create(key=key, defaults={"value": value, "description": description})
```

- [ ] **Step 3: Update `models/__init__.py`**

```python
# backend/apps/notifications/models/__init__.py
from .notification import Notification, NotificationType
from .device_token import DeviceToken, Platform
from .delivery import NotificationDelivery, DeliveryChannel, DeliveryStatus
from .template import NotificationTemplate
from .setting import NotificationSetting

__all__ = [
    "Notification",
    "NotificationType",
    "DeviceToken",
    "Platform",
    "NotificationDelivery",
    "DeliveryChannel",
    "DeliveryStatus",
    "NotificationTemplate",
    "NotificationSetting",
]
```

- [ ] **Step 4: Create migration 0004**

```bash
docker exec amanapos_app python manage.py makemigrations notifications --name notificationtemplate_notificationsetting
```

Review the generated file in `backend/apps/notifications/migrations/0004_*.py` — it should create both `notifications_templates` and `notifications_settings` tables.

- [ ] **Step 5: Apply migration and seed defaults**

```bash
docker exec amanapos_app python manage.py migrate notifications
docker exec amanapos_app python manage.py shell -c "
from apps.notifications.models import NotificationSetting
NotificationSetting.ensure_defaults()
print('Settings seeded:', list(NotificationSetting.objects.values_list('key', flat=True)))
"
```

Expected output: `Settings seeded: ['push_enabled', 'sms_enabled', 'push_daily_limit', 'sms_daily_limit']`

- [ ] **Step 6: Commit**

```bash
git add backend/apps/notifications/models/template.py \
        backend/apps/notifications/models/setting.py \
        backend/apps/notifications/models/__init__.py \
        backend/apps/notifications/migrations/0004_*.py
git commit -m "feat(notifications): add NotificationTemplate and NotificationSetting models"
```

---

## Task 2: Backend — Add sent_by_admin to NotificationDelivery

**Files:**
- Modify: `backend/apps/notifications/models/delivery.py`
- Create: `backend/apps/notifications/migrations/0005_notificationdelivery_sent_by_admin.py`

- [ ] **Step 1: Add field to delivery model**

Open `backend/apps/notifications/models/delivery.py`. After the `recipient` field, add:

```python
    sent_by_admin = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="manually_sent_deliveries",
        db_index=True,
    )
```

- [ ] **Step 2: Generate and apply migration**

```bash
docker exec amanapos_app python manage.py makemigrations notifications --name notificationdelivery_sent_by_admin
docker exec amanapos_app python manage.py migrate notifications
```

Expected: migration runs cleanly, no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/apps/notifications/models/delivery.py \
        backend/apps/notifications/migrations/0005_*.py
git commit -m "feat(notifications): track admin sender on delivery records"
```

---

## Task 3: Backend — Admin serializers

**Files:**
- Create: `backend/apps/notifications/admin_serializers.py`

- [ ] **Step 1: Write serializers**

```python
# backend/apps/notifications/admin_serializers.py
from rest_framework import serializers
from .models import NotificationTemplate, NotificationSetting, NotificationDelivery


class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NotificationTemplate
        fields = [
            "id", "key", "name", "category", "channel",
            "title_en", "body_en", "title_ar", "body_ar",
            "variables", "is_enabled", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class NotificationTemplateWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NotificationTemplate
        fields = [
            "key", "name", "category", "channel",
            "title_en", "body_en", "title_ar", "body_ar",
            "variables", "is_enabled",
        ]

    def validate_key(self, value: str) -> str:
        import re
        if not re.match(r'^[a-z][a-z0-9_]{1,98}[a-z0-9]$', value):
            raise serializers.ValidationError(
                "Key must be lowercase letters, digits, underscores; 3–100 chars."
            )
        return value

    def validate_variables(self, value) -> list:
        if not isinstance(value, list):
            raise serializers.ValidationError("variables must be a list of strings.")
        if not all(isinstance(v, str) for v in value):
            raise serializers.ValidationError("Each variable must be a string.")
        return value


class NotificationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NotificationSetting
        fields = ["key", "value", "description", "updated_at"]
        read_only_fields = ["key", "description", "updated_at"]


class ManualPushSerializer(serializers.Serializer):
    user_id     = serializers.UUIDField()
    title       = serializers.CharField(max_length=255, required=False, allow_blank=True)
    body        = serializers.CharField(required=False, allow_blank=True)
    template_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        has_custom   = attrs.get("title") and attrs.get("body")
        has_template = attrs.get("template_id")
        if not has_custom and not has_template:
            raise serializers.ValidationError(
                "Provide either (title + body) or template_id."
            )
        return attrs


class ManualSMSSerializer(serializers.Serializer):
    user_id     = serializers.UUIDField()
    message     = serializers.CharField(required=False, allow_blank=True)
    template_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        if not attrs.get("message") and not attrs.get("template_id"):
            raise serializers.ValidationError(
                "Provide either message or template_id."
            )
        return attrs


class DeliveryLogSerializer(serializers.ModelSerializer):
    recipient_name  = serializers.SerializerMethodField()
    recipient_phone = serializers.SerializerMethodField()
    notification_title = serializers.SerializerMethodField()
    sent_by_admin_name = serializers.SerializerMethodField()

    class Meta:
        model  = NotificationDelivery
        fields = [
            "id", "channel", "status",
            "recipient_name", "recipient_phone",
            "notification_title",
            "sent_by_admin_name",
            "retry_count", "provider_message_id", "error_message",
            "sent_at", "failed_at", "created_at",
        ]

    def get_recipient_name(self, obj):
        return obj.recipient.full_name or obj.recipient.phone

    def get_recipient_phone(self, obj):
        return obj.recipient.phone

    def get_notification_title(self, obj):
        return obj.notification.title if obj.notification else obj.payload.get("title", "")

    def get_sent_by_admin_name(self, obj):
        if obj.sent_by_admin:
            return obj.sent_by_admin.full_name or obj.sent_by_admin.phone
        return None
```

- [ ] **Step 2: Commit**

```bash
git add backend/apps/notifications/admin_serializers.py
git commit -m "feat(notifications): admin serializers for templates, settings, manual send, logs"
```

---

## Task 4: Backend — Admin API views

**Files:**
- Create: `backend/apps/notifications/admin_views.py`

- [ ] **Step 1: Write views**

```python
# backend/apps/notifications/admin_views.py
"""
Admin-only notification management API.
All views require IsAuthenticated + IsAdminUser.
"""
import logging

from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.core.exceptions import NotFound
from .models import (
    NotificationDelivery, NotificationSetting, NotificationTemplate,
    DeliveryStatus,
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
    """GET /api/v1/admin/notifications/templates/  — list, paginated + filtered
       POST                                         — create new template"""
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
    """GET / PATCH / DELETE /api/v1/admin/notifications/templates/{id}/"""
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
    """POST /api/v1/admin/notifications/templates/{id}/toggle/"""
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
    """GET /api/v1/admin/notifications/settings/  — return all settings
       PATCH                                        — bulk update key/value pairs"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        NotificationSetting.ensure_defaults()
        settings_qs = NotificationSetting.objects.all().order_by("key")
        return Response({
            "success": True,
            "data": NotificationSettingSerializer(settings_qs, many=True).data,
        })

    def patch(self, request):
        # Expects {"updates": [{"key": "push_enabled", "value": "false"}, ...]}
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
    """POST /api/v1/admin/notifications/send/push/"""
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

        # Resolve title/body
        if vd.get("template_id"):
            try:
                tmpl = NotificationTemplate.objects.get(pk=vd["template_id"], is_enabled=True)
                rendered = tmpl.render(locale="en")
                title = rendered["title"]
                body  = rendered["body"]
                notif_type = rendered["notification_type"]
            except NotificationTemplate.DoesNotExist:
                raise NotFound("Template not found or disabled.")
        else:
            title      = vd["title"]
            body       = vd["body"]
            notif_type = "info"

        from apps.notifications.services import notify_user
        from apps.notifications.models import NotificationDelivery

        notification = notify_user(
            user=user,
            title=title,
            body=body,
            notification_type=notif_type,
            data={"sent_by_admin": True, "admin_id": str(request.user.id)},
        )

        # Tag deliveries as sent_by_admin so logs show the sender
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
    """POST /api/v1/admin/notifications/send/sms/"""
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
    """GET /api/v1/admin/notifications/logs/"""
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/apps/notifications/admin_views.py
git commit -m "feat(notifications): admin API views — templates, settings, send, logs"
```

---

## Task 5: Backend — Admin URL routing

**Files:**
- Create: `backend/apps/notifications/admin_urls.py`
- Modify: `backend/apps/admin_panel/urls.py`

- [ ] **Step 1: Create `admin_urls.py`**

```python
# backend/apps/notifications/admin_urls.py
from django.urls import path
from . import admin_views

urlpatterns = [
    path("templates/",              admin_views.AdminTemplateListView.as_view(),   name="notif-templates"),
    path("templates/<uuid:pk>/",    admin_views.AdminTemplateDetailView.as_view(), name="notif-template-detail"),
    path("templates/<uuid:pk>/toggle/", admin_views.AdminTemplateToggleView.as_view(), name="notif-template-toggle"),
    path("settings/",               admin_views.AdminSettingsView.as_view(),       name="notif-settings"),
    path("send/push/",              admin_views.AdminSendPushView.as_view(),        name="notif-send-push"),
    path("send/sms/",               admin_views.AdminSendSMSView.as_view(),         name="notif-send-sms"),
    path("logs/",                   admin_views.AdminDeliveryLogsView.as_view(),    name="notif-logs"),
]
```

- [ ] **Step 2: Include in `admin_panel/urls.py`**

Add at the end of `urlpatterns` in `backend/apps/admin_panel/urls.py`:

```python
    path("notifications/", include("apps.notifications.admin_urls")),
```

Also add `from django.urls import path, include` if `include` is not already imported.

- [ ] **Step 3: Smoke-test the routes**

```bash
docker exec amanapos_app python manage.py shell -c "
from django.urls import reverse
print(reverse('admin_panel:notif-templates'))
print(reverse('admin_panel:notif-settings'))
print(reverse('admin_panel:notif-send-push'))
print(reverse('admin_panel:notif-logs'))
"
```

Expected output:
```
/api/v1/admin/notifications/templates/
/api/v1/admin/notifications/settings/
/api/v1/admin/notifications/send/push/
/api/v1/admin/notifications/logs/
```

- [ ] **Step 4: Restart app and verify 401 on unauthenticated request**

```bash
docker compose restart app
curl -s http://localhost:8080/api/v1/admin/notifications/templates/ | python3 -m json.tool
```

Expected: `{"detail": "Authentication credentials were not provided."}`

- [ ] **Step 5: Commit**

```bash
git add backend/apps/notifications/admin_urls.py backend/apps/admin_panel/urls.py
git commit -m "feat(notifications): wire admin notification URLs under /api/v1/admin/notifications/"
```

---

## Task 6: Frontend — API client additions

**Files:**
- Modify: `admin/src/lib/api.ts`
- Modify: `admin/src/lib/cacheTags.ts`
- Modify: `admin/src/types/api.ts`

- [ ] **Step 1: Add `apiDelete` to `api.ts`**

Append at the end of `admin/src/lib/api.ts`:

```typescript
export async function apiDelete<T>(path: string): Promise<T> {
  const res = await devFetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader()),
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
```

- [ ] **Step 2: Add cache tag to `cacheTags.ts`**

Add `notifications: 'notifications'` to the `CACHE_TAGS` object.

- [ ] **Step 3: Add types to `types/api.ts`**

Append at the end of `admin/src/types/api.ts`:

```typescript
// ── Notifications (admin) ────────────────────────────────────────────────────
export type NotifChannel = 'push' | 'sms' | 'both';
export type DeliveryStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type DeliveryChannel = 'push' | 'sms' | 'email';

export interface NotificationTemplate {
  id:         string;
  key:        string;
  name:       string;
  category:   string;
  channel:    NotifChannel;
  title_en:   string;
  body_en:    string;
  title_ar:   string;
  body_ar:    string;
  variables:  string[];
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSetting {
  key:         string;
  value:       string;
  description: string;
  updated_at:  string;
}

export interface DeliveryLog {
  id:                  string;
  channel:             DeliveryChannel;
  status:              DeliveryStatus;
  recipient_name:      string;
  recipient_phone:     string;
  notification_title:  string;
  sent_by_admin_name:  string | null;
  retry_count:         number;
  provider_message_id: string;
  error_message:       string;
  sent_at:             string | null;
  failed_at:           string | null;
  created_at:          string;
}
```

- [ ] **Step 4: Commit**

```bash
git add admin/src/lib/api.ts admin/src/lib/cacheTags.ts admin/src/types/api.ts
git commit -m "feat(notifications): add apiDelete, notifications cache tag, admin types"
```

---

## Task 7: Frontend — Notification service layer

**Files:**
- Create: `admin/src/services/notifications.ts`

- [ ] **Step 1: Write service**

```typescript
// admin/src/services/notifications.ts
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { withUserCache } from '@/lib/serverCache';
import { CACHE_TAGS } from '@/lib/cacheTags';
import type {
  ApiResponse, DeliveryLog, NotificationSetting, NotificationTemplate,
} from '@/types/api';

// ── Shared paginated type ─────────────────────────────────────────────────────
interface PagedResult<T> {
  count:       number;
  next:        string | null;
  previous:    string | null;
  results:     T[];
}

export interface TemplateParams {
  page?:     number;
  page_size?: number;
  search?:   string;
  category?: string;
  channel?:  string;
  enabled?:  string;
}

export interface LogParams {
  page?:       number;
  page_size?:  number;
  channel?:    string;
  status?:     string;
  from_date?:  string;
  to_date?:    string;
  search?:     string;
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function fetchAdminTemplates(
  params?: TemplateParams,
): Promise<PagedResult<NotificationTemplate>> {
  return withUserCache(
    (tok) =>
      apiGet<PagedResult<NotificationTemplate>>(
        '/api/v1/admin/notifications/templates/',
        params as Record<string, string>,
        { token: tok },
      ),
    [CACHE_TAGS.notifications, 'templates', JSON.stringify(params ?? {})],
    30,
  );
}

export async function fetchAdminTemplate(id: string): Promise<NotificationTemplate> {
  const res = await withUserCache(
    (tok) =>
      apiGet<ApiResponse<NotificationTemplate>>(
        `/api/v1/admin/notifications/templates/${id}/`,
        undefined,
        { token: tok },
      ),
    [CACHE_TAGS.notifications, 'template', id],
    30,
  );
  return res.data;
}

export interface TemplateInput {
  key:        string;
  name:       string;
  category:   string;
  channel:    string;
  title_en:   string;
  body_en:    string;
  title_ar:   string;
  body_ar:    string;
  variables:  string[];
  is_enabled: boolean;
}

export async function createAdminTemplate(input: TemplateInput): Promise<NotificationTemplate> {
  const res = await apiPost<ApiResponse<NotificationTemplate>>(
    '/api/v1/admin/notifications/templates/',
    input,
  );
  return res.data;
}

export async function updateAdminTemplate(
  id: string,
  input: Partial<TemplateInput>,
): Promise<NotificationTemplate> {
  const res = await apiPatch<ApiResponse<NotificationTemplate>>(
    `/api/v1/admin/notifications/templates/${id}/`,
    input,
  );
  return res.data;
}

export async function deleteAdminTemplate(id: string): Promise<void> {
  await apiDelete<{ success: boolean }>(`/api/v1/admin/notifications/templates/${id}/`);
}

export async function toggleAdminTemplate(
  id: string,
): Promise<{ id: string; is_enabled: boolean }> {
  const res = await apiPost<ApiResponse<{ id: string; is_enabled: boolean }>>(
    `/api/v1/admin/notifications/templates/${id}/toggle/`,
    {},
  );
  return res.data;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function fetchAdminNotifSettings(): Promise<NotificationSetting[]> {
  const res = await withUserCache(
    (tok) =>
      apiGet<ApiResponse<NotificationSetting[]>>(
        '/api/v1/admin/notifications/settings/',
        undefined,
        { token: tok },
      ),
    [CACHE_TAGS.notifications, 'settings'],
    30,
  );
  return res.data;
}

export async function updateAdminNotifSettings(
  updates: { key: string; value: string }[],
): Promise<NotificationSetting[]> {
  const res = await apiPatch<ApiResponse<NotificationSetting[]>>(
    '/api/v1/admin/notifications/settings/',
    { updates },
  );
  return res.data;
}

// ── Manual send ───────────────────────────────────────────────────────────────

export interface SendPushInput {
  user_id:      string;
  title?:       string;
  body?:        string;
  template_id?: string;
}

export interface SendPushResult {
  device_count:    number;
  notification_id: string;
}

export async function adminSendPush(input: SendPushInput): Promise<SendPushResult> {
  const res = await apiPost<ApiResponse<SendPushResult>>(
    '/api/v1/admin/notifications/send/push/',
    input,
  );
  return res.data;
}

export interface SendSMSInput {
  user_id:      string;
  message?:     string;
  template_id?: string;
}

export async function adminSendSMS(input: SendSMSInput): Promise<{ message: string }> {
  const res = await apiPost<ApiResponse<{ message: string }>>(
    '/api/v1/admin/notifications/send/sms/',
    input,
  );
  return res.data;
}

// ── Delivery logs ─────────────────────────────────────────────────────────────

export async function fetchAdminDeliveryLogs(
  params?: LogParams,
): Promise<PagedResult<DeliveryLog>> {
  return withUserCache(
    (tok) =>
      apiGet<PagedResult<DeliveryLog>>(
        '/api/v1/admin/notifications/logs/',
        params as Record<string, string>,
        { token: tok },
      ),
    [CACHE_TAGS.notifications, 'logs', JSON.stringify(params ?? {})],
    15,
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add admin/src/services/notifications.ts
git commit -m "feat(notifications): frontend service layer for admin notification APIs"
```

---

## Task 8: Frontend — Sidebar + routing

**Files:**
- Modify: `admin/src/components/layout/Sidebar.tsx`
- Modify: `admin/src/components/layout/AppShell.tsx`
- Modify: `admin/src/messages/en.json`
- Modify: `admin/src/messages/ar.json`

- [ ] **Step 1: Add nav item to `Sidebar.tsx`**

Add `Bell` to the lucide imports, then add to `ADMIN_NAV`:

```typescript
import {
  LayoutGrid, Users, Store, CreditCard, Server,
  Receipt, Package, BarChart2, UserCheck, CreditCard as SubIcon,
  LogOut, History, Bell,
} from 'lucide-react';

const ADMIN_NAV = [
  { key: 'dashboard',      href: '/',               Icon: LayoutGrid },
  { key: 'owners',         href: '/owners',          Icon: Users },
  { key: 'businesses',     href: '/businesses',      Icon: Store },
  { key: 'subscriptions',  href: '/subscriptions',   Icon: CreditCard },
  { key: 'plans',          href: '/plans',           Icon: Package },
  { key: 'notifications',  href: '/notifications',   Icon: Bell },
  { key: 'activityLogs',   href: '/activity-logs',   Icon: History },
  { key: 'system',         href: '/system',          Icon: Server },
] as const;
```

- [ ] **Step 2: Update `AppShell.tsx`**

Add to `PAGE_TITLES`:
```typescript
"/notifications":          "notifications",
"/notifications/templates":"notifications",
"/notifications/sender":   "notifications",
"/notifications/logs":     "notifications",
"/notifications/settings": "notifications",
```

Add to `adminTitles`:
```typescript
notifications: "Notifications",
```

- [ ] **Step 3: Add English translation keys**

In `admin/src/messages/en.json`, add a top-level `"notifications"` section:

```json
"notifications": {
  "title": "Notifications",
  "description": "Manage push notifications, SMS, templates, and delivery logs",
  "tabTemplates": "Templates",
  "tabSender": "Sender",
  "tabLogs": "Delivery Logs",
  "tabSettings": "Settings",

  "templateKey": "Key",
  "templateName": "Name",
  "templateCategory": "Category",
  "templateChannel": "Channel",
  "templateEnabled": "Enabled",
  "templateDisabled": "Disabled",
  "templateVariables": "Variables",
  "templateTitleEn": "Title (English)",
  "templateBodyEn": "Body (English)",
  "templateTitleAr": "Title (Arabic)",
  "templateBodyAr": "Body (Arabic)",
  "templatePreview": "Preview",
  "newTemplate": "New Template",
  "editTemplate": "Edit Template",
  "deleteTemplate": "Delete Template",
  "duplicateTemplate": "Duplicate",
  "toggleEnable": "Enable",
  "toggleDisable": "Disable",
  "templateSaved": "Template saved",
  "templateDeleted": "Template deleted",
  "confirmDelete": "Delete this template?",
  "keyHint": "Lowercase, underscores only (e.g. welcome_message)",
  "variablesHint": "Comma-separated variable names (e.g. owner_name, business_name)",

  "senderTitle": "Manual Sender",
  "senderDescription": "Send push notifications or SMS to any user",
  "targetUser": "Target User",
  "searchUsers": "Search by name or phone…",
  "chooseTemplate": "Use a template",
  "customMessage": "Custom message",
  "sendPush": "Send Push",
  "sendSMS": "Send SMS",
  "sending": "Sending…",
  "sentDevices": "Sent to {count} device(s)",
  "smsSent": "SMS queued",
  "pushDisabled": "Push notifications are globally disabled",
  "smsDisabled": "SMS is globally disabled",

  "logsTitle": "Delivery Logs",
  "logsDescription": "History of all sent notifications and SMS",
  "logChannel": "Channel",
  "logStatus": "Status",
  "logRecipient": "Recipient",
  "logMessage": "Message",
  "logSentBy": "Sent by",
  "logSentAt": "Sent at",
  "logRetries": "Retries",
  "logError": "Error",
  "filterChannel": "Channel",
  "filterStatus": "Status",
  "filterDate": "Date range",

  "settingsTitle": "Settings",
  "settingsDescription": "Control global notification behaviour",
  "pushEnabled": "Push Notifications",
  "pushEnabledDesc": "Enable or disable all push notifications platform-wide",
  "smsEnabled": "SMS Notifications",
  "smsEnabledDesc": "Enable or disable all SMS messages platform-wide",
  "pushDailyLimit": "Push Daily Limit",
  "pushDailyLimitDesc": "Maximum push notifications per day",
  "smsDailyLimit": "SMS Daily Limit",
  "smsDailyLimitDesc": "Maximum SMS messages per day",
  "settingsSaved": "Settings saved",

  "channelPush": "Push",
  "channelSms": "SMS",
  "channelBoth": "Both",
  "channelEmail": "Email",
  "statusPending": "Pending",
  "statusProcessing": "Processing",
  "statusSent": "Sent",
  "statusFailed": "Failed",
  "statusCancelled": "Cancelled",
  "noTemplates": "No templates yet",
  "noLogs": "No delivery logs yet",
  "createFirst": "Create your first template to get started"
}
```

- [ ] **Step 4: Add Arabic translations**

In `admin/src/messages/ar.json`, add matching `"notifications"` section:

```json
"notifications": {
  "title": "الإشعارات",
  "description": "إدارة الإشعارات والرسائل والقوالب وسجلات التسليم",
  "tabTemplates": "القوالب",
  "tabSender": "الإرسال",
  "tabLogs": "سجل التسليم",
  "tabSettings": "الإعدادات",

  "templateKey": "المفتاح",
  "templateName": "الاسم",
  "templateCategory": "الفئة",
  "templateChannel": "القناة",
  "templateEnabled": "مفعّل",
  "templateDisabled": "معطّل",
  "templateVariables": "المتغيرات",
  "templateTitleEn": "العنوان (إنجليزي)",
  "templateBodyEn": "النص (إنجليزي)",
  "templateTitleAr": "العنوان (عربي)",
  "templateBodyAr": "النص (عربي)",
  "templatePreview": "معاينة",
  "newTemplate": "قالب جديد",
  "editTemplate": "تعديل القالب",
  "deleteTemplate": "حذف القالب",
  "duplicateTemplate": "نسخ",
  "toggleEnable": "تفعيل",
  "toggleDisable": "تعطيل",
  "templateSaved": "تم حفظ القالب",
  "templateDeleted": "تم حذف القالب",
  "confirmDelete": "حذف هذا القالب؟",
  "keyHint": "أحرف صغيرة وشرطات سفلية فقط (مثال: welcome_message)",
  "variablesHint": "أسماء المتغيرات مفصولة بفواصل (مثال: owner_name, business_name)",

  "senderTitle": "الإرسال اليدوي",
  "senderDescription": "إرسال إشعارات أو رسائل SMS لأي مستخدم",
  "targetUser": "المستخدم المستهدف",
  "searchUsers": "ابحث بالاسم أو رقم الهاتف…",
  "chooseTemplate": "استخدم قالباً",
  "customMessage": "رسالة مخصصة",
  "sendPush": "إرسال إشعار",
  "sendSMS": "إرسال SMS",
  "sending": "جارٍ الإرسال…",
  "sentDevices": "تم الإرسال لـ {count} جهاز",
  "smsSent": "SMS في قائمة الإرسال",
  "pushDisabled": "الإشعارات معطّلة بشكل عام",
  "smsDisabled": "الرسائل القصيرة معطّلة بشكل عام",

  "logsTitle": "سجل التسليم",
  "logsDescription": "تاريخ جميع الإشعارات والرسائل المُرسلة",
  "logChannel": "القناة",
  "logStatus": "الحالة",
  "logRecipient": "المستلم",
  "logMessage": "الرسالة",
  "logSentBy": "أُرسل بواسطة",
  "logSentAt": "وقت الإرسال",
  "logRetries": "المحاولات",
  "logError": "الخطأ",
  "filterChannel": "القناة",
  "filterStatus": "الحالة",
  "filterDate": "نطاق التاريخ",

  "settingsTitle": "الإعدادات",
  "settingsDescription": "التحكم في سلوك الإشعارات بشكل عام",
  "pushEnabled": "إشعارات Push",
  "pushEnabledDesc": "تفعيل أو تعطيل جميع إشعارات Push على مستوى المنصة",
  "smsEnabled": "رسائل SMS",
  "smsEnabledDesc": "تفعيل أو تعطيل جميع رسائل SMS على مستوى المنصة",
  "pushDailyLimit": "الحد اليومي للإشعارات",
  "pushDailyLimitDesc": "الحد الأقصى لعدد إشعارات Push في اليوم",
  "smsDailyLimit": "الحد اليومي للرسائل",
  "smsDailyLimitDesc": "الحد الأقصى لعدد رسائل SMS في اليوم",
  "settingsSaved": "تم حفظ الإعدادات",

  "channelPush": "Push",
  "channelSms": "SMS",
  "channelBoth": "كلاهما",
  "channelEmail": "بريد إلكتروني",
  "statusPending": "قيد الانتظار",
  "statusProcessing": "قيد المعالجة",
  "statusSent": "تم الإرسال",
  "statusFailed": "فشل",
  "statusCancelled": "ملغى",
  "noTemplates": "لا توجد قوالب بعد",
  "noLogs": "لا توجد سجلات تسليم بعد",
  "createFirst": "أنشئ قالبك الأول للبدء"
}
```

- [ ] **Step 5: Add `notifications` to nav translation keys** in both en.json and ar.json under the `"nav"` section:

en.json nav: `"notifications": "Notifications"`
ar.json nav: `"notifications": "الإشعارات"`

- [ ] **Step 6: Commit**

```bash
git add admin/src/components/layout/Sidebar.tsx \
        admin/src/components/layout/AppShell.tsx \
        admin/src/messages/en.json \
        admin/src/messages/ar.json
git commit -m "feat(notifications): add notifications to admin sidebar and translations"
```

---

## Task 9: Frontend — Notifications section layout + page shell

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/notifications/layout.tsx`
- Create: `admin/src/app/[locale]/(dashboard)/notifications/page.tsx`

- [ ] **Step 1: Create layout with tab navigation**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/layout.tsx
import { getTranslations } from 'next-intl/server';
import { Bell, Send, ScrollText, Settings2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { headers } from 'next/headers';

const TABS = [
  { key: 'tabTemplates', href: '/notifications/templates', Icon: Bell },
  { key: 'tabSender',    href: '/notifications/sender',    Icon: Send },
  { key: 'tabLogs',      href: '/notifications/logs',      Icon: ScrollText },
  { key: 'tabSettings',  href: '/notifications/settings',  Icon: Settings2 },
] as const;

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('notifications');
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Bell size={20} />
        </span>
        <div>
          <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 w-fit">
        {TABS.map(({ key, href, Icon }) => {
          const active = pathname.includes(href.replace('/notifications', ''));
          return (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              {t(key)}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create redirect page**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/page.tsx
import { redirect } from 'next/navigation';

export default function NotificationsPage() {
  redirect('/notifications/templates');
}
```

- [ ] **Step 3: Add `x-pathname` middleware header** so the layout can detect the active tab. In `admin/src/middleware.ts`, ensure the response has `x-pathname`. If the middleware already exists, add this inside the handler:

```typescript
// Inside the intlMiddleware chain, after creating the response:
const response = intlMiddleware(request);
response.headers.set('x-pathname', request.nextUrl.pathname);
return response;
```

If the file structure is different, add `response.headers.set('x-pathname', request.nextUrl.pathname)` before returning from the middleware.

- [ ] **Step 4: Commit**

```bash
git add "admin/src/app/[locale]/(dashboard)/notifications/"
git commit -m "feat(notifications): notifications section layout with tab navigation"
```

---

## Task 10: Frontend — Templates list page

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/notifications/templates/page.tsx`
- Create: `admin/src/app/[locale]/(dashboard)/notifications/templates/_components/TemplatesList.tsx`

- [ ] **Step 1: Create server page**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/templates/page.tsx
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Plus } from 'lucide-react';
import TemplatesList from './_components/TemplatesList';
import { TableSkeleton } from '@/components/ds/Skeleton';

export default async function TemplatesPage() {
  const t = await getTranslations('notifications');
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{t('noTemplates')}</p>
        <Link
          href="/notifications/templates/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} />
          {t('newTemplate')}
        </Link>
      </div>
      <Suspense fallback={<TableSkeleton rows={6} />}>
        <TemplatesList />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Create `TemplatesList` client component**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/templates/_components/TemplatesList.tsx
'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  deleteAdminTemplate,
  fetchAdminTemplates,
  toggleAdminTemplate,
} from '@/services/notifications';
import type { NotificationTemplate } from '@/types/api';
import { useEffect } from 'react';

const CHANNEL_COLORS: Record<string, string> = {
  push: 'bg-blue-100 text-blue-700',
  sms:  'bg-violet-100 text-violet-700',
  both: 'bg-emerald-100 text-emerald-700',
};

export default function TemplatesList() {
  const t = useTranslations('notifications');
  const router = useRouter();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [count, setCount]         = useState(0);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [, startTransition]       = useTransition();

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAdminTemplates({ search, page, page_size: 20 });
      setTemplates(res.results);
      setCount(res.count);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search, page]);

  async function handleToggle(id: string) {
    const updated = await toggleAdminTemplate(id);
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_enabled: updated.is_enabled } : t)),
    );
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${t('confirmDelete')}\n"${name}"`)) return;
    await deleteAdminTemplate(id);
    startTransition(() => load());
  }

  return (
    <div>
      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder={`${t('templateName')} / ${t('templateKey')}…`}
        className="mb-4 w-full sm:w-80 px-3 py-2 text-sm border border-border rounded-lg bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateName')}</th>
              <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t('templateKey')}</th>
              <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">{t('templateChannel')}</th>
              <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">{t('templateCategory')}</th>
              <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateEnabled')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && templates.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  <p className="font-semibold">{t('noTemplates')}</p>
                  <p className="text-xs mt-1">{t('createFirst')}</p>
                </td>
              </tr>
            )}
            {templates.map((tmpl) => (
              <tr key={tmpl.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{tmpl.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{tmpl.key}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', CHANNEL_COLORS[tmpl.channel] ?? 'bg-muted text-muted-foreground')}>
                    {t(`channel${tmpl.channel.charAt(0).toUpperCase() + tmpl.channel.slice(1)}` as any)}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell capitalize">{tmpl.category}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(tmpl.id)}
                    className={cn('flex items-center gap-1.5 text-xs font-semibold transition-colors', tmpl.is_enabled ? 'text-success' : 'text-muted-foreground')}
                  >
                    {tmpl.is_enabled
                      ? <><ToggleRight size={16} />{t('templateEnabled')}</>
                      : <><ToggleLeft  size={16} />{t('templateDisabled')}</>
                    }
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => router.push(`/notifications/templates/${tmpl.id}/edit`)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(tmpl.id, tmpl.name)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {count > 20 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>{count} total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors">Prev</button>
            <button disabled={page * 20 >= count} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "admin/src/app/[locale]/(dashboard)/notifications/templates/"
git commit -m "feat(notifications): template list page with search, toggle, and delete"
```

---

## Task 11: Frontend — Template form (create + edit)

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/notifications/templates/_components/TemplateForm.tsx`
- Create: `admin/src/app/[locale]/(dashboard)/notifications/templates/new/page.tsx`
- Create: `admin/src/app/[locale]/(dashboard)/notifications/templates/[id]/edit/page.tsx`

- [ ] **Step 1: Create `TemplateForm`**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/templates/_components/TemplateForm.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { createAdminTemplate, updateAdminTemplate } from '@/services/notifications';
import type { NotificationTemplate } from '@/types/api';

const CATEGORIES = ['auth', 'subscription', 'stock', 'marketing', 'system', 'other'];
const CHANNELS   = ['push', 'sms', 'both'];

interface Props {
  initial?: NotificationTemplate;
}

export default function TemplateForm({ initial }: Props) {
  const t      = useTranslations('notifications');
  const router = useRouter();

  const [form, setForm] = useState({
    key:        initial?.key        ?? '',
    name:       initial?.name       ?? '',
    category:   initial?.category   ?? 'system',
    channel:    initial?.channel    ?? 'push',
    title_en:   initial?.title_en   ?? '',
    body_en:    initial?.body_en    ?? '',
    title_ar:   initial?.title_ar   ?? '',
    body_ar:    initial?.body_ar    ?? '',
    variables:  (initial?.variables ?? []).join(', '),
    is_enabled: initial?.is_enabled ?? true,
  });
  const [previewLocale, setPreviewLocale] = useState<'en' | 'ar'>('en');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const previewTitle = previewLocale === 'ar' ? form.title_ar || form.title_en : form.title_en;
  const previewBody  = previewLocale === 'ar' ? form.body_ar  || form.body_en  : form.body_en;

  function set(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        variables: form.variables.split(',').map((v) => v.trim()).filter(Boolean),
      };
      if (initial) {
        await updateAdminTemplate(initial.id, payload);
      } else {
        await createAdminTemplate(payload);
      }
      router.push('/notifications/templates');
      router.refresh();
    } catch (err: any) {
      const body = err?.body;
      if (body && typeof body === 'object') {
        const msgs = Object.entries(body).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`);
        setError(msgs.join('\n'));
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger whitespace-pre-wrap">
          {error}
        </div>
      )}

      {/* Row 1: key + name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateKey')} *</span>
          <input
            required
            value={form.key}
            onChange={(e) => set('key', e.target.value)}
            placeholder="welcome_message"
            className="mt-1.5 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
          <p className="text-[11px] text-muted-foreground mt-1">{t('keyHint')}</p>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateName')} *</span>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Welcome Message"
            className="mt-1.5 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
      </div>

      {/* Row 2: category + channel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateCategory')} *</span>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateChannel')} *</span>
          <select
            value={form.channel}
            onChange={(e) => set('channel', e.target.value)}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CHANNELS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </label>
      </div>

      {/* Row 3: variables */}
      <label className="block">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateVariables')}</span>
        <input
          value={form.variables}
          onChange={(e) => set('variables', e.target.value)}
          placeholder="owner_name, business_name, amount"
          className="mt-1.5 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        />
        <p className="text-[11px] text-muted-foreground mt-1">{t('variablesHint')}</p>
      </label>

      {/* English content */}
      <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">English</p>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">{t('templateTitleEn')} *</span>
          <input
            required
            value={form.title_en}
            onChange={(e) => set('title_en', e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">{t('templateBodyEn')} *</span>
          <textarea
            required
            rows={3}
            value={form.body_en}
            onChange={(e) => set('body_en', e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
          />
        </label>
      </div>

      {/* Arabic content */}
      <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20" dir="rtl">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider" dir="ltr">Arabic</p>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">{t('templateTitleAr')}</span>
          <input
            value={form.title_ar}
            onChange={(e) => set('title_ar', e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary text-right"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">{t('templateBodyAr')}</span>
          <textarea
            rows={3}
            value={form.body_ar}
            onChange={(e) => set('body_ar', e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none text-right"
          />
        </label>
      </div>

      {/* Live preview */}
      <div className="p-4 rounded-xl border border-border bg-[#0D1117] text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <Eye size={12} />
            <span className="font-semibold uppercase tracking-wider">{t('templatePreview')}</span>
          </div>
          <div className="flex gap-1">
            {(['en', 'ar'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setPreviewLocale(l)}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase transition-colors ${previewLocale === l ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1" dir={previewLocale === 'ar' ? 'rtl' : 'ltr'}>
          <p className="text-[13px] font-bold text-white/90">{previewTitle || '—'}</p>
          <p className="text-xs text-white/55 leading-relaxed">{previewBody || '—'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : t('templateSaved')}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create new template page**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/templates/new/page.tsx
import { getTranslations } from 'next-intl/server';
import TemplateForm from '../_components/TemplateForm';

export default async function NewTemplatePage() {
  const t = await getTranslations('notifications');
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-6">{t('newTemplate')}</h2>
      <TemplateForm />
    </div>
  );
}
```

- [ ] **Step 3: Create edit template page**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/templates/[id]/edit/page.tsx
import { getTranslations } from 'next-intl/server';
import { fetchAdminTemplate } from '@/services/notifications';
import TemplateForm from '../../_components/TemplateForm';

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
  const t        = await getTranslations('notifications');
  const template = await fetchAdminTemplate(params.id);
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-6">{t('editTemplate')}</h2>
      <TemplateForm initial={template} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add "admin/src/app/[locale]/(dashboard)/notifications/templates/"
git commit -m "feat(notifications): template create/edit form with live bilingual preview"
```

---

## Task 12: Frontend — Manual push/SMS sender page

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/notifications/sender/page.tsx`
- Create: `.../sender/_components/UserSearchSelector.tsx`
- Create: `.../sender/_components/PushSenderForm.tsx`

- [ ] **Step 1: Create `UserSearchSelector`**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/sender/_components/UserSearchSelector.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { apiGet } from '@/lib/api';

interface UserOption {
  id:        string;
  full_name: string;
  phone:     string;
  role:      string;
}

interface Props {
  value?: UserOption | null;
  onChange: (user: UserOption | null) => void;
  placeholder?: string;
}

export default function UserSearchSelector({ value, onChange, placeholder }: Props) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<UserOption[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiGet<{ success: boolean; data: { results: UserOption[] } }>(
          '/api/v1/admin/owners/',
          { search: query, page_size: 10 },
        );
        setResults(res.data?.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
        <div>
          <p className="text-sm font-semibold text-foreground">{value.full_name}</p>
          <p className="text-xs text-muted-foreground">{value.phone} · {value.role}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? 'Search by name or phone…'}
          className="w-full ps-9 pe-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {loading && (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">…</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => { onChange(u); setOpen(false); setQuery(''); }}
              className="w-full text-start px-4 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0"
            >
              <p className="text-sm font-semibold text-foreground">{u.full_name}</p>
              <p className="text-xs text-muted-foreground">{u.phone}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `PushSenderForm`**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/sender/_components/PushSenderForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import UserSearchSelector from './UserSearchSelector';
import { adminSendPush, adminSendSMS, fetchAdminTemplates } from '@/services/notifications';
import type { NotificationTemplate } from '@/types/api';
import { cn } from '@/lib/utils';

type Mode = 'push' | 'sms';

interface UserOption { id: string; full_name: string; phone: string; role: string }

export default function ManualSenderForm() {
  const t = useTranslations('notifications');

  const [mode,        setMode]        = useState<Mode>('push');
  const [user,        setUser]        = useState<UserOption | null>(null);
  const [templates,   setTemplates]   = useState<NotificationTemplate[]>([]);
  const [templateId,  setTemplateId]  = useState('');
  const [useTemplate, setUseTemplate] = useState(false);
  const [title,       setTitle]       = useState('');
  const [body,        setBody]        = useState('');
  const [message,     setMessage]     = useState('');
  const [sending,     setSending]     = useState(false);
  const [result,      setResult]      = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetchAdminTemplates({ channel: mode === 'push' ? 'push' : 'sms', enabled: 'true', page_size: 50 })
      .then((r) => setTemplates(r.results));
  }, [mode]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSending(true);
    setResult(null);
    try {
      if (mode === 'push') {
        const res = await adminSendPush(
          useTemplate && templateId
            ? { user_id: user.id, template_id: templateId }
            : { user_id: user.id, title, body },
        );
        setResult({ ok: true, text: t('sentDevices', { count: res.device_count }) });
      } else {
        await adminSendSMS(
          useTemplate && templateId
            ? { user_id: user.id, template_id: templateId }
            : { user_id: user.id, message },
        );
        setResult({ ok: true, text: t('smsSent') });
      }
    } catch (err: any) {
      const msg = err?.body?.message ?? err?.message ?? 'Failed to send.';
      setResult({ ok: false, text: msg });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSend} className="max-w-lg space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(['push', 'sms'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setResult(null); }}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
              mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'push' ? t('sendPush') : t('sendSMS')}
          </button>
        ))}
      </div>

      {/* User selector */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{t('targetUser')} *</p>
        <UserSearchSelector value={user} onChange={setUser} placeholder={t('searchUsers')} />
      </div>

      {/* Template or custom */}
      <div className="flex gap-3">
        {(['template', 'custom'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setUseTemplate(opt === 'template')}
            className={cn(
              'flex-1 py-2 rounded-lg border text-sm font-semibold transition-all',
              useTemplate === (opt === 'template')
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {opt === 'template' ? t('chooseTemplate') : t('customMessage')}
          </button>
        ))}
      </div>

      {useTemplate ? (
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          required
          className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">— {t('chooseTemplate')} —</option>
          {templates.map((tmpl) => (
            <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
          ))}
        </select>
      ) : mode === 'push' ? (
        <div className="space-y-3">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${t('templateTitleEn')}…`}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea
            required
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`${t('templateBodyEn')}…`}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>
      ) : (
        <textarea
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="SMS message…"
          className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      )}

      {/* Result */}
      {result && (
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-xl text-sm font-medium',
          result.ok ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20',
        )}>
          {result.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {result.text}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={sending || !user}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Send size={14} />
        {sending ? t('sending') : mode === 'push' ? t('sendPush') : t('sendSMS')}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create sender page**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/sender/page.tsx
import { getTranslations } from 'next-intl/server';
import ManualSenderForm from './_components/PushSenderForm';

export default async function SenderPage() {
  const t = await getTranslations('notifications');
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">{t('senderDescription')}</p>
      <ManualSenderForm />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add "admin/src/app/[locale]/(dashboard)/notifications/sender/"
git commit -m "feat(notifications): manual push/SMS sender with user search and template selection"
```

---

## Task 13: Frontend — Delivery logs page

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/notifications/logs/page.tsx`
- Create: `.../logs/_components/LogsTable.tsx`

- [ ] **Step 1: Create `LogsTable`**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/logs/_components/LogsTable.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { fetchAdminDeliveryLogs } from '@/services/notifications';
import type { DeliveryLog } from '@/types/api';

const STATUS_STYLES: Record<string, string> = {
  sent:       'bg-success/10 text-success',
  failed:     'bg-danger/10 text-danger',
  pending:    'bg-warning/10 text-warning',
  processing: 'bg-blue-100 text-blue-700',
  cancelled:  'bg-muted text-muted-foreground',
};

const CHANNEL_STYLES: Record<string, string> = {
  push:  'bg-blue-100 text-blue-700',
  sms:   'bg-violet-100 text-violet-700',
  email: 'bg-orange-100 text-orange-700',
};

export default function LogsTable() {
  const t = useTranslations('notifications');

  const [logs,    setLogs]    = useState<DeliveryLog[]>([]);
  const [count,   setCount]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ channel: '', status: '', search: '' });

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAdminDeliveryLogs({ ...filters, page, page_size: 20 });
      setLogs(res.results);
      setCount(res.count);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filters, page]);

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filters.channel}
          onChange={(e) => setFilter('channel', e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t('filterChannel')}: All</option>
          <option value="push">{t('channelPush')}</option>
          <option value="sms">{t('channelSms')}</option>
          <option value="email">{t('channelEmail')}</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t('filterStatus')}: All</option>
          <option value="sent">{t('statusSent')}</option>
          <option value="failed">{t('statusFailed')}</option>
          <option value="pending">{t('statusPending')}</option>
          <option value="processing">{t('statusProcessing')}</option>
          <option value="cancelled">{t('statusCancelled')}</option>
        </select>

        <input
          type="search"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          placeholder="Search name / phone…"
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-56"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('logRecipient')}</th>
                <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t('logMessage')}</th>
                <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('logChannel')}</th>
                <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('logStatus')}</th>
                <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">{t('logSentBy')}</th>
                <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">{t('logSentAt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">{t('noLogs')}</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{log.recipient_name}</p>
                    <p className="text-xs text-muted-foreground">{log.recipient_phone}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[260px] hidden md:table-cell">
                    <p className="truncate text-muted-foreground text-xs">{log.notification_title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', CHANNEL_STYLES[log.channel] ?? 'bg-muted text-muted-foreground')}>
                      {log.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', STATUS_STYLES[log.status] ?? 'bg-muted text-muted-foreground')}>
                      {t(`status${log.status.charAt(0).toUpperCase() + log.status.slice(1)}` as any)}
                    </span>
                    {log.retry_count > 0 && (
                      <span className="ms-1.5 text-[10px] text-muted-foreground">×{log.retry_count}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                    {log.sent_by_admin_name ?? 'System'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">
                    {log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {count > 20 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>{count} total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">Prev</button>
            <button disabled={page * 20 >= count} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create logs page**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/logs/page.tsx
import { getTranslations } from 'next-intl/server';
import LogsTable from './_components/LogsTable';

export default async function LogsPage() {
  const t = await getTranslations('notifications');
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{t('logsDescription')}</p>
      <LogsTable />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "admin/src/app/[locale]/(dashboard)/notifications/logs/"
git commit -m "feat(notifications): delivery logs page with channel/status/search filters"
```

---

## Task 14: Frontend — Settings page

**Files:**
- Create: `admin/src/app/[locale]/(dashboard)/notifications/settings/page.tsx`
- Create: `.../settings/_components/SettingsPanel.tsx`

- [ ] **Step 1: Create `SettingsPanel`**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/settings/_components/SettingsPanel.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { updateAdminNotifSettings } from '@/services/notifications';
import type { NotificationSetting } from '@/types/api';
import { cn } from '@/lib/utils';

const BOOLEAN_KEYS = ['push_enabled', 'sms_enabled'];
const NUMBER_KEYS  = ['push_daily_limit', 'sms_daily_limit'];

const KEY_META: Record<string, { titleKey: string; descKey: string }> = {
  push_enabled:    { titleKey: 'pushEnabled',    descKey: 'pushEnabledDesc' },
  sms_enabled:     { titleKey: 'smsEnabled',     descKey: 'smsEnabledDesc' },
  push_daily_limit:{ titleKey: 'pushDailyLimit', descKey: 'pushDailyLimitDesc' },
  sms_daily_limit: { titleKey: 'smsDailyLimit',  descKey: 'smsDailyLimitDesc' },
};

export default function SettingsPanel({ initial }: { initial: NotificationSetting[] }) {
  const t = useTranslations('notifications');
  const [settings, setSettings] = useState<NotificationSetting[]>(initial);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  function setValue(key: string, value: string) {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s)),
    );
  }

  function get(key: string) {
    return settings.find((s) => s.key === key)?.value ?? '';
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateAdminNotifSettings(
        settings.map((s) => ({ key: s.key, value: s.value })),
      );
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      {/* Boolean toggles */}
      {BOOLEAN_KEYS.filter((k) => KEY_META[k]).map((key) => {
        const meta   = KEY_META[key];
        const enabled = get(key).toLowerCase() === 'true';
        return (
          <div
            key={key}
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{t(meta.titleKey as any)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t(meta.descKey as any)}</p>
            </div>
            <button
              type="button"
              onClick={() => setValue(key, enabled ? 'false' : 'true')}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                enabled ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            >
              <span className={cn(
                'absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                enabled ? 'translate-x-5 [dir=rtl]:-translate-x-5' : 'translate-x-0',
              )} />
            </button>
          </div>
        );
      })}

      {/* Number inputs */}
      {NUMBER_KEYS.filter((k) => KEY_META[k]).map((key) => {
        const meta = KEY_META[key];
        return (
          <div key={key} className="p-4 rounded-xl border border-border bg-card">
            <p className="text-sm font-semibold text-foreground">{t(meta.titleKey as any)}</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">{t(meta.descKey as any)}</p>
            <input
              type="number"
              min={0}
              value={get(key)}
              onChange={(e) => setValue(key, e.target.value)}
              className="w-32 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        );
      })}

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : t('settingsSaved')}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 size={14} />
            {t('settingsSaved')}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create settings server page**

```typescript
// admin/src/app/[locale]/(dashboard)/notifications/settings/page.tsx
import { getTranslations } from 'next-intl/server';
import { fetchAdminNotifSettings } from '@/services/notifications';
import SettingsPanel from './_components/SettingsPanel';

export default async function NotifSettingsPage() {
  const t        = await getTranslations('notifications');
  const settings = await fetchAdminNotifSettings();
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">{t('settingsDescription')}</p>
      <SettingsPanel initial={settings} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "admin/src/app/[locale]/(dashboard)/notifications/settings/"
git commit -m "feat(notifications): notification settings page with toggles and limits"
```

---

## Task 15: Verify end-to-end + update docs

- [ ] **Step 1: Run app build check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | head -40
```

Fix any TypeScript errors before continuing.

- [ ] **Step 2: Restart app container, check no Python errors**

```bash
docker compose restart app celery_worker
docker logs amanapos_app --tail 30 2>&1 | grep -i "error\|traceback" | head -20
```

Expected: no errors.

- [ ] **Step 3: Quick API smoke test**

```bash
# Get admin token first (use your test credentials)
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login/verify-otp/ \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+249XXXXXXXXX","otp":"222222"}' | python3 -m json.tool | grep '"access"' | cut -d'"' -f4)

# List templates (should return empty list)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/admin/notifications/templates/ | python3 -m json.tool

# Get settings
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/admin/notifications/settings/ | python3 -m json.tool
```

Expected: templates returns `{"count":0,"results":[]}`, settings returns 4 seeded entries.

- [ ] **Step 4: Update `docs/notifications.md`** — append section:

```markdown
## Admin Management API

All endpoints require `is_staff=True`. Base path: `/api/v1/admin/notifications/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/templates/` | List templates (search, category, channel, enabled filters) |
| POST | `/templates/` | Create template |
| GET | `/templates/{id}/` | Get template |
| PATCH | `/templates/{id}/` | Update template |
| DELETE | `/templates/{id}/` | Delete template |
| POST | `/templates/{id}/toggle/` | Toggle enabled/disabled |
| GET | `/settings/` | Get all settings |
| PATCH | `/settings/` | Bulk update settings |
| POST | `/send/push/` | Manual push to a user |
| POST | `/send/sms/` | Manual SMS to a user |
| GET | `/logs/` | Delivery logs (channel, status, date, search filters) |
```

- [ ] **Step 5: Update Postman collection**

```bash
python3 /Users/almogdadjabir/Documents/projects/AmanaPOS/update_postman_collection.py 2>/dev/null || \
python3 - << 'PYEOF'
import json, pathlib

path = pathlib.Path("/Users/almogdadjabir/Documents/projects/AmanaPOS/AmanaPOS.postman_collection.json")
col  = json.loads(path.read_text())

admin_notif = {
  "name": "Admin — Notifications",
  "item": [
    {"name": "List Templates",    "request": {"method": "GET",    "url": {"raw": "{{base_url}}/api/v1/admin/notifications/templates/"}, "header": [{"key": "Authorization", "value": "Bearer {{token}}"}]}},
    {"name": "Create Template",   "request": {"method": "POST",   "url": {"raw": "{{base_url}}/api/v1/admin/notifications/templates/"}, "header": [{"key": "Authorization", "value": "Bearer {{token}}"},{"key":"Content-Type","value":"application/json"}], "body": {"mode": "raw", "raw": json.dumps({"key":"welcome_promo","name":"Welcome Promo","category":"marketing","channel":"push","title_en":"Hello!","body_en":"Welcome back, {owner_name}!","title_ar":"مرحبا!","body_ar":"أهلاً بعودتك {owner_name}!","variables":["owner_name"],"is_enabled":True}, indent=2)}}},
    {"name": "Toggle Template",   "request": {"method": "POST",   "url": {"raw": "{{base_url}}/api/v1/admin/notifications/templates/{{template_id}}/toggle/"}, "header": [{"key": "Authorization", "value": "Bearer {{token}}"}]}},
    {"name": "Get Settings",      "request": {"method": "GET",    "url": {"raw": "{{base_url}}/api/v1/admin/notifications/settings/"}, "header": [{"key": "Authorization", "value": "Bearer {{token}}"}]}},
    {"name": "Update Settings",   "request": {"method": "PATCH",  "url": {"raw": "{{base_url}}/api/v1/admin/notifications/settings/"}, "header": [{"key": "Authorization", "value": "Bearer {{token}}"},{"key":"Content-Type","value":"application/json"}], "body": {"mode": "raw", "raw": json.dumps({"updates":[{"key":"push_enabled","value":"false"}]}, indent=2)}}},
    {"name": "Send Push",         "request": {"method": "POST",   "url": {"raw": "{{base_url}}/api/v1/admin/notifications/send/push/"}, "header": [{"key": "Authorization", "value": "Bearer {{token}}"},{"key":"Content-Type","value":"application/json"}], "body": {"mode": "raw", "raw": json.dumps({"user_id":"{{user_id}}","title":"Test","body":"Hello from admin"}, indent=2)}}},
    {"name": "Send SMS",          "request": {"method": "POST",   "url": {"raw": "{{base_url}}/api/v1/admin/notifications/send/sms/"},  "header": [{"key": "Authorization", "value": "Bearer {{token}}"},{"key":"Content-Type","value":"application/json"}], "body": {"mode": "raw", "raw": json.dumps({"user_id":"{{user_id}}","message":"Hello from admin"}, indent=2)}}},
    {"name": "Delivery Logs",     "request": {"method": "GET",    "url": {"raw": "{{base_url}}/api/v1/admin/notifications/logs/?channel=push&status=sent"}, "header": [{"key": "Authorization", "value": "Bearer {{token}}"}]}},
  ]
}

col["item"].append(admin_notif)
path.write_text(json.dumps(col, indent=2, ensure_ascii=False))
print("Postman collection updated.")
PYEOF
```

- [ ] **Step 6: Final commit**

```bash
git add docs/notifications.md AmanaPOS.postman_collection.json
git commit -m "docs: update notifications docs and Postman collection for admin management APIs"
```

---

## Self-Review Against Spec

| Spec requirement | Covered by task |
|-----------------|----------------|
| Notification Template Management (CRUD, toggle, preview, search, filter) | Tasks 3–4, 10–11 |
| Template fields: key, type, title_en/ar, body_en/ar, variables, enabled, category | Task 1, 3 |
| Live preview rendering with variable interpolation | Task 11 |
| Notification Settings (global push/SMS enable, per-template toggle, limits) | Tasks 1, 4, 14 |
| Manual Push Sender (search user, custom or template, device count feedback) | Tasks 4, 12 |
| SMS Sender (same pattern) | Tasks 4, 12 |
| Delivery Logs with filters (channel, status, date, user) + pagination | Tasks 4, 13 |
| Admin-only permissions (`IsAdminUser`) | Tasks 4–5 |
| Bilingual support (EN + AR) | Tasks 8, 11 |
| Real APIs, no mock data | All tasks — no fixtures, every page hits live backend |
| Postman collection updated | Task 15 |
| Docs updated | Task 15 |
| `sent_by_admin` tracking | Task 2 |
