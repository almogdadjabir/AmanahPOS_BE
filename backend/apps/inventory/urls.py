from django.urls import path
from . import views

app_name = "inventory"

urlpatterns = [
    # ── Stock ─────────────────────────────────────────────────────────────────
    path("stock/",             views.StockLevelListView.as_view(),  name="stock_list"),
    path("stock/add/",         views.StockAddView.as_view(),        name="stock_add"),
    path("stock/adjust/",      views.StockAdjustView.as_view(),     name="stock_adjust"),
    path("stock/transfer/",    views.StockTransferView.as_view(),   name="stock_transfer"),

    # ── Movements ─────────────────────────────────────────────────────────────
    path("movements/",         views.StockMovementListView.as_view(), name="movement_list"),

    # ── Batches & expiry ──────────────────────────────────────────────────────
    path("batches/",           views.BatchListView.as_view(),        name="batch_list"),
    path("batches/<uuid:pk>/", views.BatchDetailView.as_view(),      name="batch_detail"),
    path("expiry-alerts/",     views.ExpiryAlertsView.as_view(),     name="expiry_alerts"),

    # ── Inbound receiving ─────────────────────────────────────────────────────
    path("inbound/vendor-summary/", views.InboundVendorSummaryView.as_view(), name="inbound_vendor_summary"),
    path("inbound/",               views.InboundReceiveView.as_view(),        name="inbound_receive"),

    # ── Vendors ───────────────────────────────────────────────────────────────
    path("vendors/",           views.VendorListCreateView.as_view(), name="vendor_list"),
    path("vendors/<uuid:pk>/", views.VendorDetailView.as_view(),     name="vendor_detail"),
]
