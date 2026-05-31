"""
Centralized notification templates for AmanaPOS.

All user-visible notification strings live here — never hardcode titles or
bodies in views, tasks, or signals.  Use render_notification() to produce
the payload dict that notify_user() or send_push_notification.delay() expects.

Usage:
    from apps.notifications.notification_templates import render_notification

    payload = render_notification("welcome")
    payload = render_notification("new_device_login", device_name="iPhone 15 Pro Max")
    payload = render_notification("low_stock",
                                  product_name="Pepsi 500ml",
                                  shop_name="Main Branch",
                                  current_qty=3,
                                  min_qty=10)
"""

# ── Template registry ─────────────────────────────────────────────────────────
#
# Each entry:
#   title            – str, supports {placeholders}
#   body             – str, supports {placeholders}
#   notification_type – must match NotificationType choices

_TEMPLATES: dict[str, dict] = {
    # ── Auth ──────────────────────────────────────────────────────────────────
    "welcome": {
        "title": "Welcome to AmanaPOS!",
        "body": "Your account is ready. Start managing your business from anywhere.",
        "notification_type": "success",
    },
    "new_device_login": {
        "title": "New device login",
        "body": (
            "Your account was just accessed from a new device: {device_name}. "
            "If this wasn't you, contact support immediately."
        ),
        "notification_type": "warning",
    },

    # ── Inventory ─────────────────────────────────────────────────────────────
    "low_stock": {
        "title": "Low Stock Alert",
        "body": (
            "'{product_name}' at {shop_name} is running low. "
            "Stock: {current_qty} (min: {min_qty})"
        ),
        "notification_type": "stock",
    },

    # ── Expiry ────────────────────────────────────────────────────────────────
    "product_expiring_soon": {
        "title": "Product Expiring Soon",
        "body": (
            "'{product_name}' at {shop_name} will expire on {expiry_date}. "
            "Check your inventory to avoid waste."
        ),
        "notification_type": "warning",
    },
    "product_expired": {
        "title": "Product Expired",
        "body": (
            "'{product_name}' at {shop_name} expired on {expiry_date}. "
            "Remove it from stock immediately."
        ),
        "notification_type": "error",
    },

    # ── Subscriptions ─────────────────────────────────────────────────────────
    "subscription_expiry": {
        "title": "Subscription Expiring Soon",
        "body": (
            "Your {business_name} subscription expires in {days_remaining} day(s). "
            "Renew now to avoid interruption."
        ),
        "notification_type": "subscription",
    },
}


# ── Public API ────────────────────────────────────────────────────────────────

def render_notification(key: str, locale: str = "en", **kwargs) -> dict:
    """
    Return a bilingual notification payload dict with title/body formatted by kwargs.

    Lookup order:
      1. DB NotificationTemplate (supports AR + EN, admin-editable)
      2. Hardcoded _TEMPLATES dict (English-only fallback)

    Returns:
        {"title": "...", "body": "...", "notification_type": "..."}

    Raises:
        KeyError: if key is not found in DB (enabled) and not in _TEMPLATES.
    """
    # 1. Try DB template first (admin-editable, bilingual)
    try:
        from apps.notifications.models import NotificationTemplate
        tmpl = NotificationTemplate.objects.get(key=key, is_enabled=True)
        return tmpl.render(locale=locale, **kwargs)
    except Exception:
        pass

    # 2. Fall back to hardcoded dict (English only)
    if key not in _TEMPLATES:
        raise KeyError(
            f"Unknown notification template {key!r}. "
            f"Available: {', '.join(_TEMPLATES)}"
        )
    tmpl = _TEMPLATES[key].copy()
    if kwargs:
        tmpl["title"] = tmpl["title"].format(**kwargs)
        tmpl["body"]  = tmpl["body"].format(**kwargs)
    return tmpl
