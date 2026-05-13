"""
Celery tasks for inventory.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name="apps.inventory.tasks.check_expiry_alerts",
    queue="notifications",
)
def check_expiry_alerts() -> None:
    """
    Daily task: find product batches that are expired or expiring soon,
    send push notification to the business owner.

    Only runs for SHOP business type. Skips RESTAURANT.
    Deduplicates: skips batches where last_notified_date == today.
    Respects NotificationSetting keys: expiry_alert_enabled,
    expiry_warning_days, expired_alert_enabled.
    """
    from datetime import timedelta

    from django.utils import timezone

    from apps.notifications.models import NotificationSetting
    from apps.notifications.notification_templates import render_notification
    from apps.notifications.services import notify_user
    from apps.tenants.models import BusinessType

    from .models import ProductBatch

    today = timezone.now().date()

    expiry_enabled  = NotificationSetting.get_bool("expiry_alert_enabled",  True)
    expired_enabled = NotificationSetting.get_bool("expired_alert_enabled", True)

    if not expiry_enabled and not expired_enabled:
        logger.info("check_expiry_alerts: all expiry notifications disabled — skipping.")
        return

    try:
        warning_days = int(NotificationSetting.get("expiry_warning_days", "7"))
    except ValueError:
        warning_days = 7

    # Use the largest possible cutoff so per-product overrides don't miss anything.
    from django.db.models import Max
    max_product_days = (
        ProductBatch.objects
        .filter(shop__business__business_type=BusinessType.SHOP)
        .aggregate(m=Max("product__expiry_alert_days"))["m"] or 0
    )
    query_cutoff = today + timedelta(days=max(warning_days, max_product_days))

    batches = (
        ProductBatch.objects
        .filter(
            expiry_date__lte=query_cutoff,
            shop__business__business_type=BusinessType.SHOP,
        )
        .exclude(last_notified_date=today)
        .select_related("product", "shop", "shop__business", "shop__business__owner")
        .order_by("expiry_date")
    )

    notified = 0
    for batch in batches:
        effective_days = batch.product.expiry_alert_days if batch.product.expiry_alert_days is not None else warning_days
        # Skip if expiry is beyond this product's alert window (and not expired)
        if batch.expiry_date > today + timedelta(days=effective_days):
            continue

        owner = batch.shop.business.owner
        expiry_str = batch.expiry_date.strftime("%Y-%m-%d")

        try:
            if batch.expiry_date < today:
                if not expired_enabled:
                    continue
                payload = render_notification(
                    "product_expired",
                    product_name=batch.product.name,
                    shop_name=batch.shop.name,
                    expiry_date=expiry_str,
                )
            else:
                if not expiry_enabled:
                    continue
                payload = render_notification(
                    "product_expiring_soon",
                    product_name=batch.product.name,
                    shop_name=batch.shop.name,
                    expiry_date=expiry_str,
                )

            notify_user(
                user=owner,
                title=payload["title"],
                body=payload["body"],
                notification_type=payload["notification_type"],
                data={
                    "type":        payload["notification_type"],
                    "product_id":  str(batch.product_id),
                    "shop_id":     str(batch.shop_id),
                    "batch_id":    str(batch.id),
                    "expiry_date": expiry_str,
                },
            )

            batch.last_notified_date = today
            batch.save(update_fields=["last_notified_date", "updated_at"])
            notified += 1

        except Exception as exc:
            logger.error("check_expiry_alerts: failed for batch %s: %s", batch.id, exc)

    logger.info("check_expiry_alerts: sent %d expiry notifications.", notified)
