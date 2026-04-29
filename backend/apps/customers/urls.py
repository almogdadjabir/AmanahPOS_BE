from django.urls import path
from . import views

app_name = "customers"

urlpatterns = [
    path("", views.CustomerListCreateView.as_view(), name="customer_list_create"),
    path("<uuid:pk>/", views.CustomerDetailView.as_view(), name="customer_detail"),
]
