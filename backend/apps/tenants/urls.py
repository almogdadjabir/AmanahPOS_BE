from django.urls import path
from . import views

app_name = "tenants"

urlpatterns = [
    path("businesses/", views.BusinessListCreateView.as_view(), name="business_list_create"),
    path("businesses/<uuid:pk>/", views.BusinessDetailView.as_view(), name="business_detail"),
    path("businesses/<uuid:business_id>/shops/", views.ShopListCreateView.as_view(), name="shop_list_create"),
    path("businesses/<uuid:business_id>/shops/<uuid:shop_id>/", views.ShopDetailView.as_view(), name="shop_detail"),
]
