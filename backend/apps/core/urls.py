"""
Core health-check URL.
"""
from django.http import JsonResponse
from django.urls import path
from django.db import connection
from django.core.cache import cache


def health_check(request):
    """Simple health check endpoint for load balancers."""
    health = {"status": "ok", "checks": {}}

    # DB check
    try:
        connection.ensure_connection()
        health["checks"]["database"] = "ok"
    except Exception:
        health["checks"]["database"] = "error"
        health["status"] = "degraded"

    # Cache/Redis check
    try:
        cache.set("health_check", "ok", timeout=5)
        result = cache.get("health_check")
        health["checks"]["cache"] = "ok" if result == "ok" else "error"
    except Exception:
        health["checks"]["cache"] = "error"
        health["status"] = "degraded"

    status_code = 200 if health["status"] == "ok" else 503
    return JsonResponse(health, status=status_code)


urlpatterns = [
    path("", health_check, name="health_check"),
]
