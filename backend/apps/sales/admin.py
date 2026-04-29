from django.contrib import admin
from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    fields = ["product", "quantity", "unit_price", "discount", "subtotal"]
    readonly_fields = ["subtotal"]
    raw_id_fields = ["product"]


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = [
        "receipt_number", "tenant", "shop", "cashier", "customer",
        "net_amount", "payment_method", "status", "created_at",
    ]
    list_filter = ["status", "payment_method"]
    search_fields = ["receipt_number", "tenant__name", "cashier__phone", "customer__name"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "receipt_number", "net_amount", "created_at", "updated_at"]
    inlines = [SaleItemInline]
    raw_id_fields = ["tenant", "shop", "cashier", "customer"]
    date_hierarchy = "created_at"
    list_per_page = 50


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ["sale", "product", "quantity", "unit_price", "discount", "subtotal"]
    search_fields = ["sale__receipt_number", "product__name", "product__sku"]
    readonly_fields = ["id"]
    raw_id_fields = ["sale", "product"]
