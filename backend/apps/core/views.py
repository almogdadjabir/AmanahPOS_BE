from django.http import JsonResponse


def handler404(request, exception=None):
    return JsonResponse(
        {
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "The requested URL was not found.",
                "details": None,
            },
        },
        status=404,
    )


def handler500(request):
    return JsonResponse(
        {
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "details": None,
            },
        },
        status=500,
    )
