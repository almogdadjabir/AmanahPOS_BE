import uuid

from django.db import models


class StockLevel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="stock_levels",
        db_index=True,
    )
    shop = models.ForeignKey(
        "tenants.Shop",
        on_delete=models.CASCADE,
        related_name="stock_levels",
        db_index=True,
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_stock_levels"
        verbose_name = "Stock Level"
        verbose_name_plural = "Stock Levels"
        unique_together = [["product", "shop"]]
        indexes = [
            models.Index(fields=["product", "shop"]),
        ]

    def __str__(self):
        return f"{self.product.name} @ {self.shop.name} = {self.quantity}"

    @property
    def is_low_stock(self) -> bool:
        return self.quantity <= self.product.min_stock_level

    @property
    def is_out_of_stock(self) -> bool:
        return self.quantity <= 0
