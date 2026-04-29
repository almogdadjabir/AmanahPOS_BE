from django.contrib import admin
from .models import Business, Shop


class ShopInline(admin.TabularInline):
    model = Shop
    extra = 0
    fields = ["name", "address", "phone", "is_active"]
    readonly_fields = []


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "slug", "is_active", "shop_count", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "slug", "owner__phone", "owner__email"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "slug", "created_at", "updated_at"]
    inlines = [ShopInline]
    raw_id_fields = ["owner", "subscription_plan"]

    def shop_count(self, obj):
        return obj.shops.filter(is_active=True).count()
    shop_count.short_description = "Active Shops"


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ["name", "business", "phone", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "business__name"]
    ordering = ["business__name", "name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    raw_id_fields = ["business"]
