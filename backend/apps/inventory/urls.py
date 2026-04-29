from django.urls import path
from . import views

app_name = "inventory"

urlpatterns = [
    path("stock/", views.StockLevelListView.as_view(), name="stock_list"),
    path("movements/", views.StockMovementListView.as_view(), name="movement_list"),
    path("stock/add/", views.StockAddView.as_view(), name="stock_add"),
    path("stock/adjust/", views.StockAdjustView.as_view(), name="stock_adjust"),
    path("stock/transfer/", views.StockTransferView.as_view(), name="stock_transfer"),
]
