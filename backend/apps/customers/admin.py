from django.contrib import admin
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["name", "phone", "email", "tenant", "loyalty_points", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "phone", "email", "tenant__name"]
    ordering = ["name"]
    readonly_fields = ["id", "loyalty_points", "created_at", "updated_at"]
    raw_id_fields = ["tenant"]
