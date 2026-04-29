"""
Business logic for tenants app.
"""
import logging

from apps.core.exceptions import SubscriptionLimitError
from .models import Business, Shop

logger = logging.getLogger(__name__)


def create_business(owner, name: str, **kwargs) -> Business:
    """
    Create a new Business for the given owner and auto-link it to the owner's profile.
    """
    business = Business.objects.create(owner=owner, name=name, **kwargs)
    logger.info("Business created: %s (owner=%s)", business.id, owner.phone)

    Shop.objects.create(
        business=business,
        name=f"{name} - Main Branch",
        address=kwargs.get("address", ""),
        phone=kwargs.get("phone", ""),
    )

    owner.business = business
    owner.save(update_fields=["business", "updated_at"])
    return business


def add_shop(business: Business, name: str, address: str = "", phone: str = "") -> Shop:
    """
    Add a new shop to a business.
    Validates subscription plan limits.
    """
    plan = business.subscription_plan
    if plan and business.shop_count >= plan.max_shops:
        raise SubscriptionLimitError(
            f"Your '{plan.name}' plan allows a maximum of {plan.max_shops} shops."
        )

    shop = Shop.objects.create(
        business=business,
        name=name,
        address=address,
        phone=phone,
    )
    logger.info("Shop created: %s for business %s", shop.id, business.id)
    return shop


def deactivate_business(business: Business) -> None:
    """Deactivate a business and all its shops."""
    business.is_active = False
    business.save(update_fields=["is_active", "updated_at"])
    business.shops.filter(is_active=True).update(is_active=False)
    logger.info("Business deactivated: %s", business.id)


def get_user_businesses(user):
    """Return all businesses owned by the user."""
    return Business.objects.filter(owner=user, is_active=True).prefetch_related("shops")
