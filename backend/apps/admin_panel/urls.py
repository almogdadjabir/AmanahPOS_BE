from django.urls import path
from . import views

app_name = "admin_panel"

urlpatterns = [
    path("stats/",         views.AdminStatsView.as_view(),        name="stats"),
    path("owners/",        views.AdminOwnerListView.as_view(),     name="owners"),
    path("owners/<uuid:pk>/",               views.AdminOwnerDetailView.as_view(),       name="owner-detail"),
    path("owners/<uuid:pk>/toggle-status/", views.AdminOwnerToggleStatusView.as_view(), name="owner-toggle-status"),
    path("businesses/",    views.AdminBusinessListView.as_view(),  name="businesses"),
    path("subscriptions/", views.AdminSubscriptionListView.as_view(), name="subscriptions"),
]
