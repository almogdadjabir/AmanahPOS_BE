from django.contrib import admin
from .models import Plan, Subscription


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ["name", "price", "currency", "max_shops", "max_products", "duration_days", "is_active", "is_free"]
    list_filter = ["is_active", "is_free"]
    search_fields = ["name"]
    ordering = ["sort_order", "price"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["business", "plan", "start_date", "end_date", "is_active", "days_remaining", "created_at"]
    list_filter = ["is_active", "plan"]
    search_fields = ["business__name", "payment_reference"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "created_at", "updated_at", "is_expired", "days_remaining"]
    raw_id_fields = ["business", "plan"]

    def days_remaining(self, obj):
        return obj.days_remaining
    days_remaining.short_description = "Days Left"
