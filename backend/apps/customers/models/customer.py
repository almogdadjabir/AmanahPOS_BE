import uuid

from django.db import models


class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Business", on_delete=models.CASCADE, related_name="customers", db_index=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, db_index=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    loyalty_points = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customers_customers"
        verbose_name = "Customer"
        verbose_name_plural = "Customers"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "phone"]),
            models.Index(fields=["tenant", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.phone or 'no phone'})"

    @property
    def total_purchases(self):
        from django.db.models import Sum
        result = self.purchases.filter(status="completed").aggregate(total=Sum("net_amount"))
        return result["total"] or 0
