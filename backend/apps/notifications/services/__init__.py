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


def send_whatsapp_reply(to_phone: str, body: str) -> dict:
    """
    Send a free-form WhatsApp reply using the Twilio Messages API.

    Only valid within the 24-hour customer service window (i.e. the recipient
    sent an inbound message to our WhatsApp number within the last 24 hours).
    Uses the Messaging Service SID — no Content SID / template required.

    Returns:
        {"message_sid": str, "status": str}

    Raises:
        RuntimeError: on Twilio API error or missing configuration.
    """
    from django.conf import settings

    try:
        from twilio.rest import Client
    except ImportError:
        raise RuntimeError("twilio package not installed")

    account_sid          = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    auth_token           = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    messaging_service_sid = getattr(settings, "TWILIO_MESSAGING_SERVICE_SID", "")

    if not all([account_sid, auth_token, messaging_service_sid]):
        raise RuntimeError(
            "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID must all be set"
        )

    client = Client(account_sid, auth_token)
    message = client.messages.create(
        to=f"whatsapp:{to_phone}",
        messaging_service_sid=messaging_service_sid,
        body=body,
    )
    return {"message_sid": message.sid, "status": message.status}
