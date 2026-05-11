from django.urls import path
from . import views

app_name = "notifications"

urlpatterns = [
    # In-app notifications
    path("",                    views.NotificationListView.as_view(),       name="list"),
    path("unread-count/",       views.NotificationUnreadCountView.as_view(),name="unread_count"),
    path("mark-all-read/",      views.NotificationMarkAllReadView.as_view(),name="mark_all_read"),
    path("<uuid:pk>/read/",     views.NotificationMarkReadView.as_view(),   name="mark_read"),

    # Device tokens
    path("devices/",            views.DeviceListView.as_view(),             name="device_list"),
    path("devices/register/",   views.DeviceRegisterView.as_view(),         name="device_register"),
    path("devices/unregister/", views.DeviceUnregisterView.as_view(),       name="device_unregister"),
]
