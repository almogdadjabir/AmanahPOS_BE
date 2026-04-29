import uuid

from django.db import models
from django.utils import timezone


class Subscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey("tenants.Business", on_delete=models.CASCADE, related_name="subscriptions", db_index=True)
    plan = models.ForeignKey("subscriptions.Plan", on_delete=models.PROTECT, related_name="subscriptions")
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True, db_index=True)
    payment_reference = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions_subscriptions"
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business", "is_active"]),
            models.Index(fields=["end_date"]),
        ]

    def __str__(self):
        return f"{self.business.name} - {self.plan.name} ({self.start_date} → {self.end_date})"

    @property
    def is_expired(self) -> bool:
        return timezone.now().date() > self.end_date

    @property
    def days_remaining(self) -> int:
        today = timezone.now().date()
        return max(0, (self.end_date - today).days)

    def deactivate(self):
        self.is_active = False
        self.save(update_fields=["is_active", "updated_at"])
