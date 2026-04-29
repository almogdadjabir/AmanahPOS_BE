"""
AmanaPOS URL Configuration

Public  (no token needed) → /api-public/v1/...
Private (token required)  → /api/v1/...
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from apps.core.views import handler404, handler500  # noqa: F401 — Django reads these at module level


urlpatterns = [
    path("admin/", admin.site.urls),

    # ── Health check — no token, no rate limit ────────────────────────────────
    path("api/v1/health/", include("apps.core.urls")),

    # ── Public API — no token required ────────────────────────────────────────
    path("api-public/v1/", include([
        path("auth/", include("apps.accounts.public_urls", namespace="auth_public")),
    ])),

    # ── Private API — valid JWT required ──────────────────────────────────────
    path("api/v1/", include([
        path("auth/", include("apps.accounts.urls", namespace="accounts")),
        path("users/", include("apps.accounts.user_urls", namespace="users")),
        path("tenants/", include("apps.tenants.urls", namespace="tenants")),
        path("products/", include("apps.products.urls", namespace="products")),
        path("inventory/", include("apps.inventory.urls", namespace="inventory")),
        path("sales/", include("apps.sales.urls", namespace="sales")),
        path("customers/", include("apps.customers.urls", namespace="customers")),
        path("subscriptions/", include("apps.subscriptions.urls", namespace="subscriptions")),
    ])),

    # ── API Docs ───────────────────────────────────────────────────────────────
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
