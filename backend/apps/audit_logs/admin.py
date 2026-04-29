from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["action", "model_name", "object_id", "user", "ip_address", "method", "created_at"]
    list_filter = ["action", "method", "model_name"]
    search_fields = ["user__phone", "user__email", "model_name", "object_id", "ip_address"]
    ordering = ["-created_at"]
    readonly_fields = [
        "id", "user", "action", "model_name", "object_id", "changes",
        "ip_address", "user_agent", "endpoint", "method", "extra", "created_at",
    ]
    date_hierarchy = "created_at"
    list_per_page = 100

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
