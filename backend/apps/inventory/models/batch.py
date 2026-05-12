import uuid
from datetime import date

from django.db import models


class ProductBatch(models.Model):
    """
    A batch of product stock received on a specific date with an expiry date.

    Separate from StockLevel (which tracks total current quantity).
    Shop-only: restaurant businesses do not use expiry tracking.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product      = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="batches",
        db_index=True,
    )
    shop         = models.ForeignKey(
        "tenants.Shop",
        on_delete=models.CASCADE,
        related_name="product_batches",
        db_index=True,
    )
    quantity     = models.DecimalField(max_digits=12, decimal_places=3)
    expiry_date  = models.DateField(db_index=True)
    batch_number = models.CharField(max_length=100, blank=True)
    notes        = models.TextField(blank=True)
    last_notified_date = models.DateField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_product_batches"
        verbose_name = "Product Batch"
        verbose_name_plural = "Product Batches"
        ordering = ["expiry_date"]
        indexes = [
            models.Index(fields=["product", "shop", "expiry_date"]),
            models.Index(fields=["shop", "expiry_date"]),
        ]

    def __str__(self):
        return f"{self.product.name} @ {self.shop.name} expires {self.expiry_date}"

    @property
    def is_expired(self) -> bool:
        return self.expiry_date < date.today()

    def is_expiring_soon(self, warning_days: int = 7) -> bool:
        from datetime import timedelta
        today = date.today()
        return today <= self.expiry_date <= today + timedelta(days=warning_days)
