"""
Celery tasks for notifications.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name="apps.notifications.tasks.send_push_notification",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="notifications",
)
def send_push_notification(self, user_id: str, title: str, body: str, data: dict | None = None):
    """
    Send a push notification to a specific user.
    Creates an in-app Notification record and (optionally) sends FCM/APNs push.

    Args:
        user_id: UUID string of the target user.
        title: Notification title.
        body: Notification body text.
        data: Optional extra data dict.
    """
    from apps.accounts.models import CustomUser
    from .models import Notification

    data = data or {}

    try:
        user = CustomUser.objects.get(pk=user_id)
    except CustomUser.DoesNotExist:
        logger.warning("send_push_notification: User %s not found.", user_id)
        return

    # Create in-app notification record
    notification = Notification.objects.create(
        user=user,
        title=title,
        body=body,
        data=data,
        notification_type=data.get("type", "info"),
    )
    logger.info("Push notification created: %s for user %s", notification.id, user_id)

    # Send FCM push (stub - integrate with Firebase/FCM in production)
    _send_fcm_push(user=user, title=title, body=body, data=data)


def _send_fcm_push(user, title: str, body: str, data: dict) -> None:
    """
    Send push notification via FCM.
    Stub implementation — integrate with firebase-admin-sdk in production.
    """
    logger.info("[FCM STUB] To: %s | Title: %s | Body: %s", user.phone, title, body)
    # In production:
    # from firebase_admin import messaging
    # message = messaging.Message(
    #     notification=messaging.Notification(title=title, body=body),
    #     data={k: str(v) for k, v in data.items()},
    #     token=user.fcm_token,
    # )
    # messaging.send(message)


@shared_task(
    name="apps.notifications.tasks.send_sms_task",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    queue="notifications",
)
def send_sms_task(self, phone: str, message: str):
    """
    Send an SMS message to a phone number.

    Args:
        phone: E.164 phone number.
        message: SMS message text.
    """
    from apps.core.utils import send_sms_otp
    try:
        # Re-use the send_sms_otp helper which handles provider dispatch
        from django.conf import settings
        provider = getattr(settings, "SMS_PROVIDER", "stub")
        logger.info("[SMS TASK] Provider=%s | To: %s | Msg: %s", provider, phone, message[:50])

        if provider == "twilio":
            from apps.core.utils import _send_twilio_sms
            success = _send_twilio_sms(phone, message)
        else:
            logger.info("[SMS STUB] To: %s | Message: %s", phone, message)
            success = True

        if not success:
            raise Exception("SMS send failed.")

    except Exception as exc:
        logger.error("SMS task failed for %s: %s", phone, exc)
        raise self.retry(exc=exc)


@shared_task(
    name="apps.notifications.tasks.send_low_stock_notification",
    queue="notifications",
)
def send_low_stock_notification(product_id: str, shop_id: str, current_qty: float, min_qty: int):
    """
    Send a low-stock alert notification to the business owner.
    """
    from apps.products.models import Product
    from apps.tenants.models import Shop

    try:
        product = Product.objects.select_related("tenant__owner").get(pk=product_id)
        shop = Shop.objects.get(pk=shop_id)
        owner = product.tenant.owner

        send_push_notification.delay(
            user_id=str(owner.id),
            title="Low Stock Alert",
            body=(
                f"'{product.name}' at {shop.name} is running low. "
                f"Current stock: {current_qty} (min: {min_qty})"
            ),
            data={
                "type": "stock",
                "product_id": product_id,
                "shop_id": shop_id,
                "current_qty": current_qty,
                "min_qty": min_qty,
            },
        )
    except Exception as exc:
        logger.error("Failed to send low stock notification: %s", exc)


@shared_task(
    name="apps.notifications.tasks.mark_notifications_read",
    queue="notifications",
)
def mark_notifications_read(user_id: str, notification_ids: list[str] | None = None):
    """
    Mark notifications as read for a user.
    If notification_ids is None, marks ALL notifications as read.
    """
    from .models import Notification

    qs = Notification.objects.filter(user_id=user_id, is_read=False)
    if notification_ids:
        qs = qs.filter(id__in=notification_ids)

    count = qs.update(is_read=True)
    logger.info("Marked %d notifications as read for user %s", count, user_id)


@shared_task(
    name="apps.accounts.tasks.cleanup_expired_otps",
    queue="default",
)
def cleanup_expired_otps():
    """
    Cleanup task: OTPs are stored in Redis with TTL so this is mostly
    a no-op, but we log the call for monitoring purposes.
    """
    logger.info("OTP cleanup: OTPs are TTL-managed in Redis. Nothing to do.")
