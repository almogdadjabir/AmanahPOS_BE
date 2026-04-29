import uuid
from decimal import Decimal

from django.db import models
from django.core.validators import MinValueValidator


class SaleItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey("sales.Sale", on_delete=models.CASCADE, related_name="items", db_index=True)
    product = models.ForeignKey("products.Product", on_delete=models.PROTECT, related_name="sale_items", db_index=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, validators=[MinValueValidator(Decimal("0.001"))])
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])

    class Meta:
        db_table = "sales_sale_items"
        verbose_name = "Sale Item"
        verbose_name_plural = "Sale Items"
        ordering = ["id"]

    def __str__(self):
        return f"{self.product.name} x{self.quantity} @ {self.unit_price}"
