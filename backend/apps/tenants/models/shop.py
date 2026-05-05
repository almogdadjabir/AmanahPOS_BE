import uuid

from django.db import models


class Shop(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        "tenants.Business",
        on_delete=models.CASCADE,
        related_name="shops",
        db_index=True,
    )
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_main = models.BooleanField(default=False, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenants_shops"
        verbose_name = "Shop"
        verbose_name_plural = "Shops"
        ordering = ["-is_main", "name"]
        indexes = [
            models.Index(fields=["business", "is_active"]),
            models.Index(fields=["business", "is_main"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.business.name})"
