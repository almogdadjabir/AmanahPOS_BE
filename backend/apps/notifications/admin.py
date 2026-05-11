from django.contrib import admin

from .models import DeviceToken, Notification, NotificationDelivery


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ["id", "user", "notification_type", "title", "is_read", "created_at"]
    list_filter   = ["notification_type", "is_read", "created_at"]
    search_fields = ["user__phone", "user__full_name", "title"]
    readonly_fields = ["id", "created_at"]
    ordering      = ["-created_at"]
    date_hierarchy = "created_at"


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display  = ["id", "user", "platform", "is_active", "app_version", "last_seen_at", "created_at"]
    list_filter   = ["platform", "is_active", "created_at"]
    search_fields = ["user__phone", "user__full_name", "device_id"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_fields(self, request, obj=None):
        # Never show the raw token in the admin form to avoid accidental exposure
        fields = super().get_fields(request, obj)
        return [f for f in fields if f != "token"]


@admin.register(NotificationDelivery)
class NotificationDeliveryAdmin(admin.ModelAdmin):
    list_display  = ["id", "recipient", "channel", "status", "retry_count", "sent_at", "created_at"]
    list_filter   = ["channel", "status", "created_at"]
    search_fields = ["recipient__phone", "recipient__full_name"]
    readonly_fields = ["id", "created_at", "updated_at", "sent_at", "failed_at"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
