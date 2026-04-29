import uuid

from django.db import models


class Plan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="AED")
    max_shops = models.PositiveIntegerField(default=1)
    max_products = models.PositiveIntegerField(default=100)
    max_users = models.PositiveIntegerField(default=3)
    duration_days = models.PositiveIntegerField(default=30)
    features = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    is_free = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions_plans"
        verbose_name = "Plan"
        verbose_name_plural = "Plans"
        ordering = ["sort_order", "price"]

    def __str__(self):
        return f"{self.name} ({self.price} {self.currency}/{self.duration_days}d)"

    def has_feature(self, feature_key: str) -> bool:
        return bool(self.features.get(feature_key, False))
