from django.urls import path
from . import views

app_name = "inventory"

urlpatterns = [
    path("stock/",             views.StockLevelListView.as_view(),    name="stock_list"),
    path("movements/",         views.StockMovementListView.as_view(), name="movement_list"),
    path("stock/add/",         views.StockAddView.as_view(),          name="stock_add"),
    path("stock/adjust/",      views.StockAdjustView.as_view(),       name="stock_adjust"),
    path("stock/transfer/",    views.StockTransferView.as_view(),     name="stock_transfer"),
    path("batches/",           views.BatchListView.as_view(),         name="batch_list"),
    path("batches/<uuid:pk>/", views.BatchDetailView.as_view(),       name="batch_detail"),
    path("expiry-alerts/",     views.ExpiryAlertsView.as_view(),      name="expiry_alerts"),
]
