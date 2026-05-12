from django.urls import path
from . import admin_views

urlpatterns = [
    path("templates/",                   admin_views.AdminTemplateListView.as_view(),   name="notif-templates"),
    path("templates/<uuid:pk>/",         admin_views.AdminTemplateDetailView.as_view(), name="notif-template-detail"),
    path("templates/<uuid:pk>/toggle/",  admin_views.AdminTemplateToggleView.as_view(), name="notif-template-toggle"),
    path("settings/",                    admin_views.AdminSettingsView.as_view(),        name="notif-settings"),
    path("send/push/",                   admin_views.AdminSendPushView.as_view(),        name="notif-send-push"),
    path("send/sms/",                    admin_views.AdminSendSMSView.as_view(),         name="notif-send-sms"),
    path("logs/",                        admin_views.AdminDeliveryLogsView.as_view(),    name="notif-logs"),
]
