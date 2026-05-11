"""
Celery tasks for the notifications app.

Delivery flow
─────────────
Business action (view / service)
    └── calls notify_user()  or  send_push_notification.delay()
            └── creates Notification + NotificationDelivery(status=pending)
            └── queues deliver_push_notification.delay(delivery_id)
                    └── selects delivery with select_for_update(nowait=True)
                    └── marks processing
                    └── calls FirebaseService.send_to_user()
                    └── marks sent / failed / retries with back-off
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)

# ── Retry back-off delays (seconds) ──────────────────────────────────────────
_RETRY_DELAYS = [60, 300, 900]   # 1 min → 5 min → 15 min


# ── Core delivery task ────────────────────────────────────────────────────────

@shared_task(
    name="apps.notifications.tasks.deliver_push_notification",
    bind=True,
    max_retries=0,          # we manage retries manually via delivery.retry_count
    queue="notifications",
    acks_late=True,
    reject_on_worker_lost=True,
)
def deliver_push_notification(self, delivery_id: str) -> None:
    """
    Send a queued push notification to all active tokens for the recipient.

    Uses select_for_update(nowait=True) to prevent duplicate sends when
    multiple workers are running.
    """
    from django.db import OperationalError, transaction
    from django.utils import timezone

    from apps.notifications.models import NotificationDelivery, DeliveryStatus
    from apps.notifications.services.push.firebase_service import FirebaseService

    # ── Acquire row lock ──────────────────────────────────────────────────────
    with transaction.atomic():
        try:
            delivery = (
                NotificationDelivery.objects
                .select_for_update(nowait=True)
                .get(pk=delivery_id, status=DeliveryStatus.PENDING)
            )
        except NotificationDelivery.DoesNotExist:
            logger.debug("Delivery %s not found or not pending — skipping.", delivery_id)
            return
        except OperationalError:
            logger.warning("Delivery %s is locked by another worker — skipping.", delivery_id)
            return

        delivery.status = DeliveryStatus.PROCESSING
        delivery.save(update_fields=["status", "updated_at"])

    # ── Send ──────────────────────────────────────────────────────────────────
    payload = delivery.payload
    title   = payload.get("title", "")
    body    = payload.get("body", "")
    data    = payload.get("data", {})

    try:
        results = FirebaseService.send_to_user(
            user=delivery.recipient,
            title=title,
            body=body,
            data=data,
        )

        # No active tokens — vacuously successful (in-app notification exists)
        if not results:
            logger.info(
                "Delivery %s: no active device tokens for user %s.",
                delivery_id, delivery.recipient_id,
            )
            with transaction.atomic():
                delivery.status     = DeliveryStatus.SENT
                delivery.sent_at    = timezone.now()
                delivery.error_message = "no_active_tokens"
                delivery.save(update_fields=["status", "sent_at", "error_message", "updated_at"])
            return

        # Evaluate results — succeed if at least one token received the message
        successes = [r for r in results if r.success]
        failures  = [r for r in results if not r.success]

        if successes:
            provider_id = successes[0].message_id
            with transaction.atomic():
                delivery.status             = DeliveryStatus.SENT
                delivery.sent_at            = timezone.now()
                delivery.provider_message_id = provider_id
                if failures:
                    delivery.error_message = f"{len(failures)} token(s) failed"
                delivery.save(update_fields=[
                    "status", "sent_at", "provider_message_id", "error_message", "updated_at",
                ])
            logger.info(
                "Delivery %s sent (%d ok, %d failed).",
                delivery_id, len(successes), len(failures),
            )
        else:
            # All tokens failed — decide retry vs permanent failure
            error_msg = "; ".join(r.error for r in failures if r.error)
            _handle_delivery_failure(delivery, error_msg)

    except Exception as exc:
        logger.exception("Unexpected error in deliver_push_notification %s: %s", delivery_id, exc)
        _handle_delivery_failure(delivery, str(exc))


def _handle_delivery_failure(delivery, error_msg: str) -> None:
    """Mark delivery for retry or permanently failed."""
    from django.db import transaction
    from django.utils import timezone
    from apps.notifications.models import DeliveryStatus

    with transaction.atomic():
        delivery.refresh_from_db(fields=["retry_count", "max_retries"])

        if delivery.retry_count < delivery.max_retries:
            delay = _RETRY_DELAYS[min(delivery.retry_count, len(_RETRY_DELAYS) - 1)]
            delivery.retry_count   += 1
            delivery.status         = DeliveryStatus.PENDING
            delivery.error_message  = error_msg
            delivery.save(update_fields=["retry_count", "status", "error_message", "updated_at"])
            logger.warning(
                "Delivery %s failed (attempt %d/%d) — retrying in %ds.",
                delivery.id, delivery.retry_count, delivery.max_retries, delay,
            )
            deliver_push_notification.apply_async(
                args=[str(delivery.id)], countdown=delay
            )
        else:
            delivery.status        = DeliveryStatus.FAILED
            delivery.failed_at     = timezone.now()
            delivery.error_message = error_msg
            delivery.save(update_fields=["status", "failed_at", "error_message", "updated_at"])
            logger.error(
                "Delivery %s permanently failed after %d retries: %s",
                delivery.id, delivery.retry_count, error_msg,
            )


# ── Convenience task (called from business code / other tasks) ────────────────

@shared_task(
    name="apps.notifications.tasks.send_push_notification",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="notifications",
)
def send_push_notification(
    self,
    user_id: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    """
    Create an in-app Notification + queue push delivery for a user.

    Backward-compatible entry point — kept so existing callers
    (e.g. send_low_stock_notification) do not need to change.
    """
    from apps.accounts.models import CustomUser
    from apps.notifications.services import notify_user

    data = data or {}

    try:
        user = CustomUser.objects.get(pk=user_id)
    except CustomUser.DoesNotExist:
        logger.warning("send_push_notification: user %s not found.", user_id)
        return

    notification_type = data.get("type", "info")

    try:
        notify_user(
            user=user,
            title=title,
            body=body,
            notification_type=notification_type,
            data=data,
        )
    except Exception as exc:
        logger.exception("send_push_notification failed for user %s: %s", user_id, exc)
        raise self.retry(exc=exc)


# ── SMS task ──────────────────────────────────────────────────────────────────

@shared_task(
    name="apps.notifications.tasks.send_sms_task",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    queue="notifications",
)
def send_sms_task(self, phone: str, message: str) -> None:
    """Send an SMS message via the configured SMS provider."""
    from django.conf import settings

    try:
        provider = getattr(settings, "SMS_PROVIDER", "stub")
        logger.info("[SMS TASK] provider=%s to=%s", provider, phone)

        if provider == "twilio":
            from apps.core.utils import _send_twilio_sms
            success = _send_twilio_sms(phone, message)
        elif provider == "budgetsms":
            from apps.core.utils import _send_budgetsms
            success = _send_budgetsms(phone, message)
        else:
            logger.info("[SMS STUB] to=%s msg=%s", phone, message[:50])
            success = True

        if not success:
            raise Exception("SMS send returned failure.")

    except Exception as exc:
        logger.error("SMS task failed for %s: %s", phone, exc)
        raise self.retry(exc=exc)


# ── Domain event tasks ────────────────────────────────────────────────────────

@shared_task(
    name="apps.notifications.tasks.send_low_stock_notification",
    queue="notifications",
)
def send_low_stock_notification(
    product_id: str,
    shop_id: str,
    current_qty: float,
    min_qty: int,
) -> None:
    """Alert business owner when a product drops below its minimum stock level."""
    from apps.products.models import Product
    from apps.tenants.models import Shop

    try:
        product = Product.objects.select_related("tenant__owner").get(pk=product_id)
        shop    = Shop.objects.get(pk=shop_id)
        owner   = product.tenant.owner

        send_push_notification.delay(
            user_id=str(owner.id),
            title="Low Stock Alert",
            body=(
                f"'{product.name}' at {shop.name} is running low. "
                f"Stock: {current_qty} (min: {min_qty})"
            ),
            data={
                "type":        "stock",
                "product_id":  product_id,
                "shop_id":     shop_id,
                "current_qty": str(current_qty),
                "min_qty":     str(min_qty),
            },
        )
    except Exception as exc:
        logger.error("send_low_stock_notification failed: %s", exc)


@shared_task(
    name="apps.notifications.tasks.send_subscription_expiry_warning",
    queue="notifications",
)
def send_subscription_expiry_warning(business_id: str, days_remaining: int) -> None:
    """Warn the business owner that their subscription is expiring soon."""
    from apps.tenants.models import Business

    try:
        business = Business.objects.select_related("owner").get(pk=business_id)
        owner    = business.owner

        send_push_notification.delay(
            user_id=str(owner.id),
            title="Subscription Expiring Soon",
            body=f"Your {business.name} subscription expires in {days_remaining} day(s). Renew now to avoid interruption.",
            data={
                "type":        "subscription",
                "business_id": business_id,
                "days_remaining": str(days_remaining),
            },
        )
    except Exception as exc:
        logger.error("send_subscription_expiry_warning failed: %s", exc)


# ── Maintenance tasks ─────────────────────────────────────────────────────────

@shared_task(
    name="apps.notifications.tasks.mark_notifications_read",
    queue="notifications",
)
def mark_notifications_read(user_id: str, notification_ids: list[str] | None = None) -> None:
    """Mark notifications as read for a user (async helper)."""
    from .models import Notification

    qs = Notification.objects.filter(user_id=user_id, is_read=False)
    if notification_ids:
        qs = qs.filter(id__in=notification_ids)

    count = qs.update(is_read=True)
    logger.info("Marked %d notifications as read for user %s.", count, user_id)


@shared_task(
    name="apps.accounts.tasks.cleanup_expired_otps",
    queue="default",
)
def cleanup_expired_otps() -> None:
    """OTPs are TTL-managed in Redis. This task exists for monitoring only."""
    logger.info("OTP cleanup: OTPs are TTL-managed in Redis — nothing to do.")
