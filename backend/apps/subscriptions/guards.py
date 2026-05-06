"""
Subscription limit guards for tenant-facing API views.

Usage:
    from apps.subscriptions.guards import check_shop_limit, check_user_limit, check_product_limit

    def post(self, request, business_id):
        business = self.get_business(business_id)
        check_shop_limit(business)   # raises SubscriptionLimitError if over limit
        ...

All checks raise apps.core.exceptions.SubscriptionLimitError on failure,
which the custom exception handler converts to a 422 JSON response:
    { "success": false, "error": { "code": "...", "message": "..." } }

Convention: 0 in a plan limit field means unlimited.
Only active (is_active=True) records are counted, so deactivated items
don't consume quota.
"""
from django.utils import timezone

from apps.core.exceptions import SubscriptionLimitError


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_active_subscription(business):
    """Return the current active, non-expired Subscription for a business, or None."""
    today = timezone.now().date()
    return (
        business.subscriptions
        .filter(is_active=True, end_date__gte=today)
        .select_related('plan')
        .order_by('-end_date')
        .first()
    )


def require_active_subscription(business):
    """
    Return the active Subscription or raise SubscriptionLimitError if none.
    Also raises if the subscription is expired.
    """
    sub = get_active_subscription(business)
    if sub is None:
        raise SubscriptionLimitError(
            "No active subscription. Please subscribe to a plan to continue.",
            code='NO_SUBSCRIPTION',
        )
    return sub


# ── Resource-specific limit checks ────────────────────────────────────────────

def check_shop_limit(business):
    """
    Raise SubscriptionLimitError if the business cannot create another shop.
    Counts only active shops (is_active=True).
    """
    from apps.tenants.models import Shop

    sub = require_active_subscription(business)
    limit = sub.plan.max_shops
    if limit == 0:
        return  # 0 = unlimited

    current = Shop.objects.filter(business=business, is_active=True).count()
    if current >= limit:
        raise SubscriptionLimitError(
            f"Shop limit reached ({current}/{limit}). "
            f"Upgrade your plan or deactivate an existing shop to add a new one.",
            code='SHOP_LIMIT_REACHED',
        )


def check_user_limit(business):
    """
    Raise SubscriptionLimitError if the business cannot add another staff member.
    Counts active managers and cashiers only (owner is not counted).
    """
    from apps.accounts.models import CustomUser

    sub = require_active_subscription(business)
    limit = sub.plan.max_users
    if limit == 0:
        return  # 0 = unlimited

    current = CustomUser.objects.filter(
        business=business,
        is_active=True,
        role__in=['manager', 'cashier'],
    ).count()
    if current >= limit:
        raise SubscriptionLimitError(
            f"Staff limit reached ({current}/{limit}). "
            f"Upgrade your plan or deactivate a staff member to add a new one.",
            code='USER_LIMIT_REACHED',
        )


def check_product_limit(business):
    """
    Raise SubscriptionLimitError if the business cannot create another product.
    Counts only active products (is_active=True).
    """
    from apps.products.models import Product

    sub = require_active_subscription(business)
    limit = sub.plan.max_products
    if limit == 0:
        return  # 0 = unlimited

    current = Product.objects.filter(tenant=business, is_active=True).count()
    if current >= limit:
        raise SubscriptionLimitError(
            f"Product limit reached ({current}/{limit}). "
            f"Upgrade your plan or deactivate a product to add a new one.",
            code='PRODUCT_LIMIT_REACHED',
        )


def require_feature(business, feature_key: str, feature_name: str | None = None):
    """
    Raise SubscriptionLimitError if the plan does not include a feature.
    Feature keys map to plan.features JSON object (truthy value = enabled).
    """
    sub = require_active_subscription(business)
    if not sub.plan.has_feature(feature_key):
        label = feature_name or feature_key.replace('_', ' ').title()
        raise SubscriptionLimitError(
            f"Your plan does not include {label}. Upgrade your subscription to access this feature.",
            code='FEATURE_NOT_INCLUDED',
        )
