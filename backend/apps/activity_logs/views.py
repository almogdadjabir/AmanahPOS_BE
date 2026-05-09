from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import ActivityLog
from .serializers import ActivityLogSerializer


class ActivityLogPagination(PageNumberPagination):
    page_size             = 25
    page_size_query_param = "page_size"
    max_page_size         = 100


class AdminActivityLogListView(ListAPIView):
    """
    GET /api/v1/admin/activity-logs/
    Paginated admin activity feed. Supports filtering by action, entity_type,
    actor_id, from_date, to_date, and search (entity_label / description).
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class   = ActivityLogSerializer
    pagination_class   = ActivityLogPagination
    filter_backends    = [SearchFilter, OrderingFilter]
    search_fields      = ["entity_label", "description", "actor__full_name", "actor__phone"]
    ordering_fields    = ["created_at"]
    ordering           = ["-created_at"]

    def get_queryset(self):
        qs = ActivityLog.objects.select_related("actor")

        action = self.request.query_params.get("action")
        if action:
            qs = qs.filter(action=action)

        entity_type = self.request.query_params.get("entity_type")
        if entity_type:
            qs = qs.filter(entity_type=entity_type)

        actor_id = self.request.query_params.get("actor_id")
        if actor_id:
            qs = qs.filter(actor_id=actor_id)

        from_date = self.request.query_params.get("from_date")
        if from_date:
            qs = qs.filter(created_at__date__gte=from_date)

        to_date = self.request.query_params.get("to_date")
        if to_date:
            qs = qs.filter(created_at__date__lte=to_date)

        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})
