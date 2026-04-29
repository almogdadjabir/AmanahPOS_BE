"""
drf-spectacular schema decorators for the products app.
Kept here so view methods stay clean.
"""
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers

from .serializers import CategorySerializer, ProductSerializer

_CATEGORIES = ["Categories"]
_PRODUCTS = ["Products"]

_page_params = [
    OpenApiParameter("page", int, description="Page number", default=1),
    OpenApiParameter("page_size", int, description="Results per page (max 200)", default=20),
]

# ── Categories ────────────────────────────────────────────────────────────────

category_list = extend_schema(
    summary="List top-level categories",
    tags=_CATEGORIES,
    responses={200: CategorySerializer(many=True)},
)

category_create = extend_schema(
    summary="Create a category",
    tags=_CATEGORIES,
    responses={201: CategorySerializer},
)

category_get = extend_schema(
    summary="Get a category",
    tags=_CATEGORIES,
    responses={200: CategorySerializer},
)

category_update = extend_schema(
    summary="Update a category",
    tags=_CATEGORIES,
    responses={200: CategorySerializer},
)

category_delete = extend_schema(
    summary="Deactivate a category",
    tags=_CATEGORIES,
    responses={200: inline_serializer("CategoryDeleteResponse", fields={
        "success": serializers.BooleanField(),
        "message": serializers.CharField(),
    })},
)

category_products = extend_schema(
    summary="Get category with its products (paginated)",
    tags=_CATEGORIES,
    parameters=_page_params,
    responses={
        200: inline_serializer("CategoryProductsResponse", fields={
            "id": serializers.UUIDField(),
            "name": serializers.CharField(),
            "count": serializers.IntegerField(),
            "total_pages": serializers.IntegerField(),
            "current_page": serializers.IntegerField(),
            "next": serializers.CharField(allow_null=True),
            "previous": serializers.CharField(allow_null=True),
            "products": ProductSerializer(many=True),
        }),
    },
)

# ── Products ──────────────────────────────────────────────────────────────────

product_list = extend_schema(
    summary="List products",
    tags=_PRODUCTS,
    parameters=[
        OpenApiParameter("category", str, description="Filter by category UUID"),
        OpenApiParameter("shop", str, description="Filter by shop UUID"),
        OpenApiParameter("search", str, description="Search by name or SKU"),
        OpenApiParameter("barcode", str, description="Filter by exact barcode"),
        *_page_params,
    ],
    responses={200: ProductSerializer(many=True)},
)

product_create = extend_schema(
    summary="Create a product",
    tags=_PRODUCTS,
    responses={201: ProductSerializer},
)

product_get = extend_schema(
    summary="Get a product",
    tags=_PRODUCTS,
    responses={200: ProductSerializer},
)

product_update = extend_schema(
    summary="Update a product",
    tags=_PRODUCTS,
    responses={200: ProductSerializer},
)

product_delete = extend_schema(
    summary="Deactivate a product",
    tags=_PRODUCTS,
    responses={200: inline_serializer("ProductDeleteResponse", fields={
        "success": serializers.BooleanField(),
        "message": serializers.CharField(),
    })},
)
