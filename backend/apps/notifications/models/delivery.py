import uuid

from django.db import models


class DeliveryChannel(models.TextChoices):
    PUSH  = "push",  "Push"
    SMS   = "sms",   "SMS"
    EMAIL = "email", "Email"


class DeliveryStatus(models.TextChoices):
    PENDING    = "pending",    "Pending"
    PROCESSING = "processing", "Processing"
    SENT       = "sent",       "Sent"
    FAILED     = "failed",     "Failed"
    CANCELLED  = "cancelled",  "Cancelled"


class NotificationDelivery(models.Model):
    """
    Outbox record tracking delivery of one notification over one channel.

    Each push delivery attempt is tracked here. The Celery task reads this
    record, attempts Firebase send, and updates status/retry_count.
    """

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification = models.ForeignKey(
        "notifications.Notification",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="deliveries",
    )
    recipient = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="notification_deliveries",
        db_index=True,
    )
    sent_by_admin = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="manually_sent_deliveries",
        db_index=True,
    )
    channel       = models.CharField(max_length=10, choices=DeliveryChannel.choices, default=DeliveryChannel.PUSH, db_index=True)
    status        = models.CharField(max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.PENDING, db_index=True)
    retry_count   = models.PositiveSmallIntegerField(default=0)
    max_retries   = models.PositiveSmallIntegerField(default=3)
    next_retry_at = models.DateTimeField(null=True, blank=True, db_index=True)
    scheduled_at  = models.DateTimeField(null=True, blank=True)
    sent_at       = models.DateTimeField(null=True, blank=True)
    failed_at     = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    provider_message_id = models.CharField(max_length=255, blank=True)
    payload       = models.JSONField(default=dict)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notifications_deliveries"
        verbose_name = "Notification Delivery"
        verbose_name_plural = "Notification Deliveries"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "status"]),
            models.Index(fields=["channel", "status"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["status", "updated_at"],    name="notif_del_status_updated_idx"),
            models.Index(fields=["status", "next_retry_at"], name="notif_del_status_retry_idx"),
        ]

    def __str__(self):
        return f"{self.channel}/{self.status} → {self.recipient}"
