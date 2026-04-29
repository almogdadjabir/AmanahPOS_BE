"""
Inventory signals: auto-update StockLevel when StockMovement is created.
"""
import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import StockMovement, StockLevel

logger = logging.getLogger(__name__)


@receiver(post_save, sender=StockMovement)
def update_stock_level(sender, instance: StockMovement, created: bool, **kwargs):
    """
    When a new StockMovement is saved, update the corresponding StockLevel.
    Uses select_for_update() inside a transaction to prevent race conditions.
    """
    if not created:
        return  # Only process new movements

    with transaction.atomic():
        stock_level, _ = StockLevel.objects.select_for_update().get_or_create(
            product=instance.product,
            shop=instance.shop,
            defaults={"quantity": 0},
        )
        stock_level.quantity += instance.quantity
        stock_level.save(update_fields=["quantity", "updated_at"])

        logger.debug(
            "StockLevel updated: product=%s shop=%s new_qty=%s (movement=%s qty=%s)",
            instance.product_id,
            instance.shop_id,
            stock_level.quantity,
            instance.movement_type,
            instance.quantity,
        )

        # Send low stock notification if needed
        if stock_level.is_low_stock and instance.product.track_inventory:
            _schedule_low_stock_notification(stock_level)


def _schedule_low_stock_notification(stock_level: StockLevel):
    """Schedule a low-stock push notification via Celery."""
    try:
        from apps.notifications.tasks import send_low_stock_notification
        send_low_stock_notification.delay(
            product_id=str(stock_level.product_id),
            shop_id=str(stock_level.shop_id),
            current_qty=float(stock_level.quantity),
            min_qty=stock_level.product.min_stock_level,
        )
    except Exception as exc:
        logger.warning("Failed to schedule low-stock notification: %s", exc)
