import uuid
from decimal import Decimal

from django.db import models
from django.core.validators import MinValueValidator


class UnitChoices(models.TextChoices):
    PIECE = "pcs", "Piece"
    KG = "kg", "Kilogram"
    GRAM = "g", "Gram"
    LITER = "l", "Liter"
    ML = "ml", "Milliliter"
    METER = "m", "Meter"
    BOX = "box", "Box"
    PACK = "pack", "Pack"
    DOZEN = "dozen", "Dozen"
    OTHER = "other", "Other"


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Business",
        on_delete=models.CASCADE,
        related_name="products",
        db_index=True,
    )
    shop = models.ForeignKey(
        "tenants.Shop",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="products",
        db_index=True,
    )
    category = models.ForeignKey(
        "products.Category",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="products",
        db_index=True,
    )
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    sku = models.CharField(max_length=100, blank=True, db_index=True)
    barcode = models.CharField(max_length=100, blank=True, db_index=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    image = models.CharField(max_length=500, blank=True, null=True, default=None)
    thumbnail = models.CharField(max_length=500, blank=True, null=True, default=None)
    unit = models.CharField(max_length=20, choices=UnitChoices.choices, default=UnitChoices.PIECE)
    is_active = models.BooleanField(default=True, db_index=True)
    track_inventory   = models.BooleanField(default=True)
    min_stock_level   = models.PositiveIntegerField(default=0)
    expiry_alert_days = models.PositiveIntegerField(null=True, blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products_products"
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "is_active"]),
            models.Index(fields=["tenant", "sku"]),
            models.Index(fields=["tenant", "barcode"]),
            models.Index(fields=["tenant", "category"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku or 'no-sku'})"

    @property
    def margin(self):
        if self.price and self.cost_price and self.price > 0:
            return ((self.price - self.cost_price) / self.price) * 100
        return 0
