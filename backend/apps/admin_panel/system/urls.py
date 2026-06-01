from django.urls import path

from . import views

app_name = "system"

urlpatterns = [
    path("overview/", views.SystemOverviewView.as_view(),  name="overview"),
    path("services/", views.SystemServicesView.as_view(),  name="services"),
    path("warnings/", views.SystemWarningsView.as_view(),  name="warnings"),
]
