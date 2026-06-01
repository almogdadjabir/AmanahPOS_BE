"""
Audit log middleware: records API requests for authenticated users.
"""
import json
import logging
import threading
import time

logger = logging.getLogger(__name__)

# Thread-local storage to hold the current request for signal access
_thread_local = threading.local()


def get_current_request():
    """Return the current request from thread-local storage."""
    return getattr(_thread_local, "request", None)


class AuditLogMiddleware:
    """
    Middleware that:
    1. Stores the request in thread-local for access anywhere in the call stack.
    2. Logs mutating API requests (POST, PUT, PATCH, DELETE) for authenticated users.
    """

    # Paths to exclude from logging
    EXCLUDED_PATHS = [
        "/api/v1/health/",
        "/admin/jsi18n/",
        "/static/",
        "/media/",
        "/__debug__/",
    ]

    # HTTP methods that we actively log
    LOGGED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Store in thread-local
        _thread_local.request = request

        start_time = time.monotonic()
        response = self.get_response(request)
        duration_ms = round((time.monotonic() - start_time) * 1000, 2)

        # Log the request if applicable
        if self._should_log(request, response):
            self._log_request(request, response, duration_ms)

        # Clear thread-local
        _thread_local.request = None
        return response

    def _should_log(self, request, response) -> bool:
        """Determine if this request should be logged."""
        # Skip excluded paths
        for path in self.EXCLUDED_PATHS:
            if request.path.startswith(path):
                return False

        # Only log authenticated users
        if not hasattr(request, "user") or not request.user.is_authenticated:
            return False

        # Only log mutating methods
        if request.method not in self.LOGGED_METHODS:
            return False

        # Skip only sub-200 responses (5xx are logged for error tracking)
        if response.status_code < 200:
            return False

        return True

    def _log_request(self, request, response, duration_ms: float):
        """Create an AuditLog entry for the request."""
        try:
            from .models import AuditLog, _get_client_ip

            action = self._get_action(request.method)
            model_name, object_id = self._extract_path_info(request.path)

            # Try to extract request body (only for small payloads)
            changes = {}
            if request.method in ("POST", "PUT", "PATCH"):
                try:
                    body = request.body
                    if len(body) <= 4096:  # Only log bodies up to 4KB
                        data = json.loads(body)
                        # Mask sensitive fields
                        changes = {
                            k: "***" if k in ("password", "otp", "token") else v
                            for k, v in data.items()
                        }
                except Exception:
                    pass

            AuditLog.objects.create(
                user=request.user,
                action=action,
                model_name=model_name,
                object_id=object_id,
                changes=changes,
                ip_address=_get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
                endpoint=request.path[:500],
                method=request.method,
                extra={
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                },
            )
        except Exception as exc:
            logger.warning("AuditLogMiddleware: Failed to log request: %s", exc)

    def _get_action(self, method: str) -> str:
        return {
            "POST": AuditLog.ActionChoices.CREATE,
            "PUT": AuditLog.ActionChoices.UPDATE,
            "PATCH": AuditLog.ActionChoices.UPDATE,
            "DELETE": AuditLog.ActionChoices.DELETE,
            "GET": AuditLog.ActionChoices.VIEW,
        }.get(method, AuditLog.ActionChoices.OTHER)

    def _extract_path_info(self, path: str) -> tuple[str, str]:
        """
        Attempt to extract model name and object ID from URL path.
        e.g. /api/v1/products/abc-123/ → ("products", "abc-123")
        """
        parts = [p for p in path.strip("/").split("/") if p]
        # Expected pattern: api/v1/<app>/<id>/
        if len(parts) >= 4:
            return parts[2], parts[3]
        elif len(parts) >= 3:
            return parts[2], ""
        elif len(parts) >= 2:
            return parts[1], ""
        return path, ""
