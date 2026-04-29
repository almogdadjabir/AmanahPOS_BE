"""
Views for the products app.
"""
import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import NotFound
from apps.core.pagination import StandardPagination
from . import schema as _schema
from .models import Category, Product
from .serializers import (
    CategoryCreateSerializer,
    CategorySerializer,
    ProductCreateSerializer,
    ProductSerializer,
)
from .services import create_category, create_product, get_tenant_from_request

logger = logging.getLogger(__name__)


class TenantMixin:
    """Resolves tenant (Business) from the authenticated user."""

    def get_tenant(self):
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            from apps.core.exceptions import BusinessLogicError
            raise BusinessLogicError("No active business found. Please create a business first.")
        return tenant


class CategoryListCreateView(TenantMixin, APIView):
    permission_classes = [IsAuthenticated]

    @_schema.category_list
    def get(self, request):
        tenant = self.get_tenant()
        categories = Category.objects.filter(
            tenant=tenant, parent=None, is_active=True
        ).prefetch_related("children")
        serializer = CategorySerializer(categories, many=True)
        return Response({"success": True, "data": serializer.data})

    @_schema.category_create
    def post(self, request):
        tenant = self.get_tenant()
        serializer = CategoryCreateSerializer(data=request.data, context={"tenant": tenant})
        serializer.is_valid(raise_exception=True)
        category = create_category(tenant=tenant, data=serializer.validated_data)
        return Response(
            {"success": True, "message": "Category created.", "data": CategorySerializer(category).data},
            status=status.HTTP_201_CREATED,
        )


class CategoryDetailView(TenantMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        tenant = self.get_tenant()
        try:
            return Category.objects.get(pk=pk, tenant=tenant)
        except Category.DoesNotExist:
            raise NotFound("Category not found.")

    @_schema.category_get
    def get(self, request, pk):
        category = self.get_object(pk)
        return Response({"success": True, "data": CategorySerializer(category).data})

    @_schema.category_update
    def patch(self, request, pk):
        category = self.get_object(pk)
        tenant = self.get_tenant()
        serializer = CategoryCreateSerializer(
            category, data=request.data, partial=True, context={"tenant": tenant}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"success": True, "message": "Category updated.", "data": CategorySerializer(category).data}
        )

    @_schema.category_delete
    def delete(self, request, pk):
        category = self.get_object(pk)
        category.is_active = False
        category.save(update_fields=["is_active", "updated_at"])
        return Response({"success": True, "message": "Category deactivated."})


class CategoryProductsView(TenantMixin, APIView):
    """GET /api/v1/products/categories/<id>/products/"""
    permission_classes = [IsAuthenticated]

    @_schema.category_products
    def get(self, request, pk):
        tenant = self.get_tenant()
        try:
            category = Category.objects.get(pk=pk, tenant=tenant, is_active=True)
        except Category.DoesNotExist:
            raise NotFound("Category not found.")

        products = Product.objects.filter(
            tenant=tenant, category=category, is_active=True
        ).select_related("category", "shop")

        paginator = StandardPagination()
        page = paginator.paginate_queryset(products, request)
        pagination = paginator.get_paginated_response(ProductSerializer(page, many=True).data).data

        response = CategorySerializer(category).data
        response["count"] = pagination["count"]
        response["total_pages"] = pagination["total_pages"]
        response["current_page"] = pagination["current_page"]
        response["next"] = pagination["next"]
        response["previous"] = pagination["previous"]
        response["products"] = pagination["results"]
        return Response(response)


class ProductListCreateView(TenantMixin, APIView):
    permission_classes = [IsAuthenticated]

    @_schema.product_list
    def get(self, request):
        tenant = self.get_tenant()
        qs = Product.objects.filter(tenant=tenant, is_active=True).select_related("category", "shop")

        category_id = request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)

        shop_id = request.query_params.get("shop")
        if shop_id:
            qs = qs.filter(shop_id=shop_id)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(sku__icontains=search)

        barcode = request.query_params.get("barcode")
        if barcode:
            qs = qs.filter(barcode=barcode)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(ProductSerializer(page, many=True).data)

    @_schema.product_create
    def post(self, request):
        tenant = self.get_tenant()
        serializer = ProductCreateSerializer(data=request.data, context={"tenant": tenant})
        serializer.is_valid(raise_exception=True)
        product = create_product(tenant=tenant, data=serializer.validated_data)
        return Response(
            {"success": True, "message": "Product created.", "data": ProductSerializer(product).data},
            status=status.HTTP_201_CREATED,
        )


class ProductDetailView(TenantMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        tenant = self.get_tenant()
        try:
            return Product.objects.select_related("category", "shop").get(pk=pk, tenant=tenant)
        except Product.DoesNotExist:
            raise NotFound("Product not found.")

    @_schema.product_get
    def get(self, request, pk):
        product = self.get_object(pk)
        return Response({"success": True, "data": ProductSerializer(product).data})

    @_schema.product_update
    def patch(self, request, pk):
        product = self.get_object(pk)
        tenant = self.get_tenant()
        serializer = ProductCreateSerializer(
            product, data=request.data, partial=True, context={"tenant": tenant}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"success": True, "message": "Product updated.", "data": ProductSerializer(product).data}
        )

    @_schema.product_delete
    def delete(self, request, pk):
        product = self.get_object(pk)
        product.is_active = False
        product.save(update_fields=["is_active", "updated_at"])
        return Response({"success": True, "message": "Product deactivated."})
