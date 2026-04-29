import json
from django.http import JsonResponse


class JsonErrorMiddleware:
    """
    Converts HTML 404/500 responses to JSON.
    Needed because Django's debug handler returns HTML for unmatched URLs
    even when DEBUG=True, bypassing DRF's exception handler.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if response.status_code in (404, 500) and self._is_html(response):
            return self._json_error(response.status_code)
        return response

    def _is_html(self, response):
        content_type = response.get("Content-Type", "")
        return "text/html" in content_type

    def _json_error(self, status_code):
        if status_code == 404:
            body = {
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "The requested URL was not found.",
                    "details": None,
                },
            }
        else:
            body = {
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred. Please try again later.",
                    "details": None,
                },
            }
        return JsonResponse(body, status=status_code)
