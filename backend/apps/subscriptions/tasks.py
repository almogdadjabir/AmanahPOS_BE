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
            from apps.notifications.tasks import send_sms_task
            send_sms_task.delay(
                phone=sub.business.owner.phone,
                message=(
                    f"Your AmanaPOS subscription '{sub.plan.name}' expires in 7 days "
                    f"on {sub.end_date}. Renew now to avoid service interruption."
                ),
            )
        except Exception as exc:
            logger.warning("Failed to send subscription reminder for %s: %s", sub.id, exc)

    logger.info("Subscription expiry check completed. %d reminders sent.", expiring_soon.count())
