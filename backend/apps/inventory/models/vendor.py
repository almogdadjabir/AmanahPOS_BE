import uuid

from django.db import models


class Vendor(models.Model):
    """
    A supplier / vendor that delivers stock to a business.

    Scoped per tenant. Used on InboundTransaction headers so reports
    can be broken down by vendor.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Business",
        on_delete=models.CASCADE,
        related_name="vendors",
        db_index=True,
    )
    name    = models.CharField(max_length=255)
    phone   = models.CharField(max_length=50,  blank=True)
    email   = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    notes   = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_vendors"
        verbose_name = "Vendor"
        verbose_name_plural = "Vendors"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "name"],
                name="unique_vendor_name_per_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "is_active"], name="inv_vendor_tenant_active_idx"),
        ]

    def __str__(self):
        return self.name
