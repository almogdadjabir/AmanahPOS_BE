import uuid

from django.db import models


class MovementType(models.TextChoices):
    IN = "in", "Stock In"
    OUT = "out", "Stock Out"
    ADJUSTMENT = "adjustment", "Adjustment"
    SALE = "sale", "Sale"
    RETURN = "return", "Return"
    TRANSFER_IN = "transfer_in", "Transfer In"
    TRANSFER_OUT = "transfer_out", "Transfer Out"
    OPENING = "opening", "Opening Stock"


class StockMovement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="stock_movements",
        db_index=True,
    )
    shop = models.ForeignKey(
        "tenants.Shop",
        on_delete=models.CASCADE,
        related_name="stock_movements",
        db_index=True,
    )
    movement_type = models.CharField(max_length=20, choices=MovementType.choices, db_index=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    reference = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.CustomUser",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="stock_movements",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "inventory_movements"
        verbose_name = "Stock Movement"
        verbose_name_plural = "Stock Movements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product", "shop", "created_at"]),
            models.Index(fields=["product", "movement_type"]),
            models.Index(fields=["reference"]),
        ]

    def __str__(self):
        return f"{self.movement_type} | {self.product.name} | qty={self.quantity}"
