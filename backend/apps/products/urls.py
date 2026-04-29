from django.urls import path
from . import views

app_name = "products"

urlpatterns = [
    path("categories/", views.CategoryListCreateView.as_view(), name="category_list_create"),
    path("categories/<uuid:pk>/", views.CategoryDetailView.as_view(), name="category_detail"),
    path("categories/<uuid:pk>/products/", views.CategoryProductsView.as_view(), name="category_products"),
    path("", views.ProductListCreateView.as_view(), name="product_list_create"),
    path("<uuid:pk>/", views.ProductDetailView.as_view(), name="product_detail"),
]
