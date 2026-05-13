import uuid

from django.db import models


class NotificationType(models.TextChoices):
    INFO = "info", "Info"
    SUCCESS = "success", "Success"
    WARNING = "warning", "Warning"
    ERROR = "error", "Error"
    SALE = "sale", "Sale"
    STOCK = "stock", "Stock Alert"
    SUBSCRIPTION = "subscription", "Subscription"
    SECURITY = "security", "Security"
    SYSTEM = "system", "System"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("accounts.CustomUser", on_delete=models.CASCADE, related_name="notifications", db_index=True)
    title = models.CharField(max_length=255)
    body = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.INFO, db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "notifications_notifications"
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.user}"

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=["is_read"])
