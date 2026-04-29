from django.contrib import admin
from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "tenant", "parent", "is_active", "sort_order", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "tenant__name"]
    ordering = ["tenant", "sort_order", "name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    raw_id_fields = ["tenant", "parent"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "sku", "tenant", "category", "price", "cost_price", "is_active", "created_at"]
    list_filter = ["is_active", "unit", "track_inventory"]
    search_fields = ["name", "sku", "barcode", "tenant__name"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "created_at", "updated_at"]
    raw_id_fields = ["tenant", "shop", "category"]
    list_per_page = 50
