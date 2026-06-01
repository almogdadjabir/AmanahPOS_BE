import logging

from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import build_service_detail, build_warnings, get_cached_system_overview

logger = logging.getLogger(__name__)

_ERROR_RESPONSE = {
    "success": False,
    "error": {
        "code": "SYSTEM_HEALTH_CHECK_FAILED",
        "message": "Unable to complete system health check",
    },
}


class SystemOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            data = get_cached_system_overview()
            return Response({"success": True, "data": data})
        except Exception as exc:
            logger.exception("System overview failed: %s", exc)
            return Response(_ERROR_RESPONSE, status=500)


class SystemServicesView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            data = build_service_detail()
            return Response({"success": True, "data": data})
        except Exception as exc:
            logger.exception("System services check failed: %s", exc)
            return Response(_ERROR_RESPONSE, status=500)


class SystemWarningsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            data = build_warnings()
            return Response({"success": True, "data": data})
        except Exception as exc:
            logger.exception("System warnings failed: %s", exc)
            return Response(_ERROR_RESPONSE, status=500)
