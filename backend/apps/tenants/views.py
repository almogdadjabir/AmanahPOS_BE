"""
Views for tenants/businesses app.
"""
import logging

from rest_framework import status
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsOwner, IsTenantMember
from .models import Business, Shop
from .serializers import (
    BusinessCreateSerializer,
    BusinessSerializer,
    BusinessUpdateSerializer,
    ShopCreateSerializer,
    ShopSerializer,
)
from .services import add_shop, create_business

logger = logging.getLogger(__name__)


class BusinessListCreateView(APIView):
    """
    GET  /api/v1/tenants/businesses/  - List my businesses
    POST /api/v1/tenants/businesses/  - Create a new business
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        businesses = Business.objects.filter(
            owner=request.user
        ).prefetch_related("shops", "subscription_plan")
        serializer = BusinessSerializer(businesses, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        serializer = BusinessCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        business = create_business(
            owner=request.user,
            name=data["name"],
            address=data.get("address", ""),
            phone=data.get("phone", ""),
            email=data.get("email") or "",
        )
        if "logo" in data:
            business.logo = data["logo"]
            business.save(update_fields=["logo"])

        return Response(
            {"success": True, "data": BusinessSerializer(business).data},
            status=status.HTTP_201_CREATED,
        )


class BusinessDetailView(APIView):
    """
    GET    /api/v1/tenants/businesses/<id>/
    PATCH  /api/v1/tenants/businesses/<id>/
    DELETE /api/v1/tenants/businesses/<id>/
    """
    permission_classes = [IsAuthenticated, IsOwner]

    def get_object(self, pk):
        try:
            business = Business.objects.prefetch_related("shops").get(pk=pk)
            self.check_object_permissions(self.request, business)
            return business
        except Business.DoesNotExist:
            from apps.core.exceptions import NotFound
            raise NotFound("Business not found.")

    def get(self, request, pk):
        business = self.get_object(pk)
        return Response({"success": True, "data": BusinessSerializer(business).data})

    def patch(self, request, pk):
        business = self.get_object(pk)
        serializer = BusinessUpdateSerializer(business, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "success": True,
                "message": "Business updated successfully.",
                "data": BusinessSerializer(business).data,
            }
        )

    def delete(self, request, pk):
        business = self.get_object(pk)
        business.is_active = False
        business.save(update_fields=["is_active", "updated_at"])
        return Response({"success": True, "message": "Business deactivated."}, status=status.HTTP_200_OK)


class ShopListCreateView(APIView):
    """
    GET  /api/v1/tenants/businesses/<business_id>/shops/
    POST /api/v1/tenants/businesses/<business_id>/shops/
    """
    permission_classes = [IsAuthenticated]

    def get_business(self, business_id):
        try:
            return Business.objects.get(pk=business_id, owner=self.request.user)
        except Business.DoesNotExist:
            from apps.core.exceptions import NotFound
            raise NotFound("Business not found.")

    def get(self, request, business_id):
        business = self.get_business(business_id)
        shops = Shop.objects.filter(business=business)
        serializer = ShopSerializer(shops, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request, business_id):
        business = self.get_business(business_id)
        serializer = ShopCreateSerializer(data=request.data, context={"business": business})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        shop = add_shop(
            business=business,
            name=data["name"],
            address=data.get("address", ""),
            phone=data.get("phone", ""),
        )
        return Response(
            {
                "success": True,
                "message": "Shop created.",
                "data": ShopSerializer(shop).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ShopDetailView(APIView):
    """
    GET    /api/v1/tenants/businesses/<business_id>/shops/<shop_id>/
    PATCH  /api/v1/tenants/businesses/<business_id>/shops/<shop_id>/
    DELETE /api/v1/tenants/businesses/<business_id>/shops/<shop_id>/
    """
    permission_classes = [IsAuthenticated]

    def get_shop(self, business_id, shop_id):
        try:
            return Shop.objects.select_related("business").get(
                pk=shop_id,
                business__id=business_id,
                business__owner=self.request.user,
            )
        except Shop.DoesNotExist:
            from apps.core.exceptions import NotFound
            raise NotFound("Shop not found.")

    def get(self, request, business_id, shop_id):
        shop = self.get_shop(business_id, shop_id)
        return Response({"success": True, "data": ShopSerializer(shop).data})

    def patch(self, request, business_id, shop_id):
        shop = self.get_shop(business_id, shop_id)
        serializer = ShopCreateSerializer(shop, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "success": True,
                "message": "Shop updated.",
                "data": ShopSerializer(shop).data,
            }
        )

    def delete(self, request, business_id, shop_id):
        shop = self.get_shop(business_id, shop_id)
        shop.is_active = False
        shop.save(update_fields=["is_active", "updated_at"])
        return Response({"success": True, "message": "Shop deactivated."})
