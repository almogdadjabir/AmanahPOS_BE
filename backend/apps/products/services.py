"""
Business logic for the products app.
"""
import logging

from apps.core.exceptions import SubscriptionLimitError
from apps.tenants.models import Business
from .models import Category, Product

logger = logging.getLogger(__name__)


def get_tenant_from_request(request):
    """
    Extract the active tenant (Business) from the request.
    Checks X-Tenant-ID header or falls back to the user's first business.
    """
    tenant_id = request.headers.get("X-Tenant-ID") or request.query_params.get("tenant_id")
    if tenant_id:
        return Business.objects.get(pk=tenant_id, owner=request.user)
    return Business.objects.filter(owner=request.user, is_active=True).first()


def create_product(tenant: Business, data: dict) -> Product:
    """
    Create a new product for the tenant.
    Validates subscription product limit.
    """
    plan = tenant.subscription_plan
    if plan:
        current_count = Product.objects.filter(tenant=tenant, is_active=True).count()
        if current_count >= plan.max_products:
            raise SubscriptionLimitError(
                f"Your plan allows a maximum of {plan.max_products} products."
            )

    product = Product.objects.create(tenant=tenant, **data)
    logger.info("Product created: %s for tenant %s", product.id, tenant.id)

    # Initialize stock level record
    if product.track_inventory:
        from apps.inventory.models import StockLevel
        shop = product.shop
        if shop:
            StockLevel.objects.get_or_create(
                product=product,
                shop=shop,
                defaults={"quantity": 0},
            )
    return product


def update_product(product: Product, data: dict) -> Product:
    """Update a product's fields."""
    for field, value in data.items():
        setattr(product, field, value)
    product.save()
    logger.info("Product updated: %s", product.id)
    return product


def deactivate_product(product: Product) -> None:
    """Soft-deactivate a product."""
    product.is_active = False
    product.save(update_fields=["is_active", "updated_at"])
    logger.info("Product deactivated: %s", product.id)


def create_category(tenant: Business, data: dict) -> Category:
    """Create a new product category."""
    category = Category.objects.create(tenant=tenant, **data)
    logger.info("Category created: %s for tenant %s", category.id, tenant.id)
    return category
