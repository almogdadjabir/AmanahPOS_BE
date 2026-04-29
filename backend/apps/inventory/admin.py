from django.contrib import admin
from .models import StockLevel, StockMovement


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ["product", "shop", "movement_type", "quantity", "reference", "created_by", "created_at"]
    list_filter = ["movement_type"]
    search_fields = ["product__name", "product__sku", "reference", "shop__name"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "created_at"]
    raw_id_fields = ["product", "shop", "created_by"]


@admin.register(StockLevel)
class StockLevelAdmin(admin.ModelAdmin):
    list_display = ["product", "shop", "quantity", "is_low_stock", "updated_at"]
    list_filter = ["shop"]
    search_fields = ["product__name", "product__sku", "shop__name"]
    ordering = ["product__name"]
    readonly_fields = ["id", "updated_at"]
    raw_id_fields = ["product", "shop"]

    def is_low_stock(self, obj):
        return obj.is_low_stock
    is_low_stock.boolean = True
    is_low_stock.short_description = "Low Stock?"
