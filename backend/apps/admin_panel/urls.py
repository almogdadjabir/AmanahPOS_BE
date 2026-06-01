from django.urls import path, include
from . import views

app_name = "admin_panel"

urlpatterns = [
    path("stats/",         views.AdminStatsView.as_view(),        name="stats"),
    path("owners/",        views.AdminOwnerListView.as_view(),     name="owners"),
    path("owners/<uuid:pk>/",               views.AdminOwnerDetailView.as_view(),       name="owner-detail"),
    path("owners/<uuid:pk>/toggle-status/", views.AdminOwnerToggleStatusView.as_view(), name="owner-toggle-status"),
    path("businesses/",               views.AdminBusinessListView.as_view(),         name="businesses"),
    path("businesses/create/",        views.AdminBusinessCreateView.as_view(),       name="business-create"),
    path("businesses/<uuid:pk>/",                views.AdminBusinessDetailView.as_view(),       name="business-detail"),
    path("businesses/<uuid:pk>/toggle-status/", views.AdminBusinessToggleStatusView.as_view(), name="business-toggle-status"),
    path("subscriptions/",               views.AdminSubscriptionListView.as_view(),      name="subscriptions"),
    path("subscriptions/create/",        views.AdminSubscriptionCreateView.as_view(),    name="subscription-create"),
    path("subscriptions/<uuid:pk>/",                views.AdminSubscriptionDetailView.as_view(),    name="subscription-detail"),
    path("subscriptions/<uuid:pk>/deactivate/",     views.AdminSubscriptionDeactivateView.as_view(), name="subscription-deactivate"),
    path("plans/",                          views.AdminPlanListView.as_view(),          name="plans"),
    path("plans/create/",                   views.AdminPlanCreateView.as_view(),        name="plan-create"),
    path("plans/<uuid:pk>/",                views.AdminPlanDetailView.as_view(),        name="plan-detail"),
    path("plans/<uuid:pk>/toggle-active/",  views.AdminPlanToggleActiveView.as_view(),  name="plan-toggle-active"),
    path("notifications/",                  include("apps.notifications.admin_urls")),
    path("system/",                         include("apps.admin_panel.system.urls")),
]
