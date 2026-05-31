"""
Celery tasks for subscriptions.
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="apps.subscriptions.tasks.check_subscription_expiry")
def check_subscription_expiry():
    """
    Check for expiring or expired subscriptions.
    - Deactivate subscriptions past end_date.
    - Send reminder notifications for subscriptions expiring within 7 days.
    """
    from .models import Subscription

    today = timezone.now().date()

    # Deactivate expired subscriptions
    expired = Subscription.objects.filter(
        is_active=True,
        end_date__lt=today,
    )
    count = expired.count()
    if count:
        expired.update(is_active=False)
        logger.info("Deactivated %d expired subscriptions.", count)

    # Send reminders for subscriptions expiring in 7 days
    reminder_date = today + timedelta(days=7)
    expiring_soon = Subscription.objects.filter(
        is_active=True,
        end_date=reminder_date,
    ).select_related("business__owner")

    for sub in expiring_soon:
        try:
            from apps.notifications.notification_templates import render_notification
            from apps.notifications.services import notify_user

            owner  = sub.business.owner
            locale = getattr(owner, "language", "en") or "en"

            payload = render_notification(
                "subscription_expiry",
                locale=locale,
                business_name=sub.business.name,
                days_remaining=7,
            )
            notify_user(
                user=owner,
                title=payload["title"],
                body=payload["body"],
                notification_type=payload["notification_type"],
                data={
                    "type":           payload["notification_type"],
                    "business_id":    str(sub.business_id),
                    "days_remaining": "7",
                    "end_date":       str(sub.end_date),
                },
            )
        except Exception as exc:
            logger.warning("Failed to send subscription reminder for %s: %s", sub.id, exc)

    logger.info("Subscription expiry check completed. %d reminders sent.", expiring_soon.count())
