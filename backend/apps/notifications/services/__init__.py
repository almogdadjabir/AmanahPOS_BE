"""
Public API for the notifications service layer.

Business code should call notify_user() — never dispatch Celery tasks directly
or import the Firebase service from outside this module.

    from apps.notifications.services import notify_user

    # Inside a transaction.atomic() block — task fires after commit:
    notify_user(user, title="Sale Complete", body="...", notification_type="sale")

    # Outside any transaction — task fires immediately:
    notify_user(user, title="Low Stock", body="...", notification_type="stock")
"""
import logging

logger = logging.getLogger(__name__)


def notify_user(
    user,
    title: str,
    body: str,
    notification_type: str = "info",
    data: dict | None = None,
):
    """
    Create an in-app Notification + queue a push NotificationDelivery.

    Safe to call from within transaction.atomic() — the Celery task is
    dispatched via transaction.on_commit() so it only runs if the outer
    transaction commits successfully.

    Returns the created Notification instance.
    """
    from django.db import transaction

    from apps.notifications.models import (
        Notification,
        NotificationDelivery,
        DeliveryStatus,
        DeliveryChannel,
    )
    from apps.notifications.tasks import deliver_push_notification

    data = data or {}

    notification = Notification.objects.create(
        user=user,
        title=title,
        body=body,
        notification_type=notification_type,
        data=data,
    )

    delivery = NotificationDelivery.objects.create(
        notification=notification,
        recipient=user,
        channel=DeliveryChannel.PUSH,
        status=DeliveryStatus.PENDING,
        payload={"title": title, "body": body, "data": data},
    )

    delivery_id = str(delivery.id)

    # on_commit fires immediately if there is no enclosing transaction,
    # or after the outermost transaction commits — either way correct.
    transaction.on_commit(lambda: deliver_push_notification.delay(delivery_id))

    return notification
