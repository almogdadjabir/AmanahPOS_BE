from django.urls import path
from . import views

app_name = "sales"

urlpatterns = [
    path("", views.SaleListCreateView.as_view(), name="sale_list_create"),
    path("summary/", views.SalesSummaryView.as_view(), name="sale_summary"),
    path("dashboard-summary/", views.DashboardSummaryView.as_view(), name="dashboard_summary"),
    path("offline-sync/", views.OfflineSyncView.as_view(), name="sale_offline_sync"),
    path("<uuid:pk>/", views.SaleDetailView.as_view(), name="sale_detail"),
    path("<uuid:pk>/cancel/", views.SaleCancelView.as_view(), name="sale_cancel"),
    path("<uuid:pk>/refund/", views.SaleRefundView.as_view(), name="sale_refund"),
]
