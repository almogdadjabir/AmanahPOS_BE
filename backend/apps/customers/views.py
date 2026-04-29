"""
Views for the customers app.
"""
import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import NotFound, BusinessLogicError
from apps.core.pagination import StandardPagination
from apps.products.services import get_tenant_from_request
from .models import Customer
from .serializers import CustomerCreateSerializer, CustomerSerializer

logger = logging.getLogger(__name__)


class CustomerListCreateView(APIView):
    """
    GET  /api/v1/customers/
    POST /api/v1/customers/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        qs = Customer.objects.filter(tenant=tenant, is_active=True)

        search = request.query_params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(phone__icontains=search) |
                Q(email__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = CustomerSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        serializer = CustomerCreateSerializer(
            data=request.data,
            context={"tenant": tenant},
        )
        serializer.is_valid(raise_exception=True)
        customer = Customer.objects.create(tenant=tenant, **serializer.validated_data)

        return Response(
            {
                "success": True,
                "message": "Customer created.",
                "data": CustomerSerializer(customer).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CustomerDetailView(APIView):
    """
    GET    /api/v1/customers/<id>/
    PATCH  /api/v1/customers/<id>/
    DELETE /api/v1/customers/<id>/
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        tenant = get_tenant_from_request(self.request)
        if not tenant:
            raise BusinessLogicError("No active business found.")
        try:
            return Customer.objects.get(pk=pk, tenant=tenant, is_active=True)
        except Customer.DoesNotExist:
            raise NotFound("Customer not found.")

    def get(self, request, pk):
        customer = self.get_object(pk)
        return Response({"success": True, "data": CustomerSerializer(customer).data})

    def patch(self, request, pk):
        customer = self.get_object(pk)
        tenant = get_tenant_from_request(request)
        serializer = CustomerCreateSerializer(
            customer,
            data=request.data,
            partial=True,
            context={"tenant": tenant},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "success": True,
                "message": "Customer updated.",
                "data": CustomerSerializer(customer).data,
            }
        )

    def delete(self, request, pk):
        customer = self.get_object(pk)
        customer.is_active = False
        customer.save(update_fields=["is_active", "updated_at"])
        return Response({"success": True, "message": "Customer deactivated."})
