from django.contrib import admin
from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display  = ["created_at", "actor", "action", "entity_type", "entity_label", "ip_address"]
    list_filter   = ["action", "entity_type"]
    search_fields = ["entity_label", "description", "actor__full_name", "actor__phone"]
    readonly_fields = [f.name for f in ActivityLog._meta.fields]
    ordering      = ["-created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
