import uuid
from decimal import Decimal

from django.db import models
from django.core.validators import MinValueValidator


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Cash"
    CARD = "card", "Card"
    BANK_TRANSFER = "bank_transfer", "Bank Transfer"
    MOBILE_WALLET = "mobile_wallet", "Mobile Wallet"
    LOYALTY_POINTS = "loyalty_points", "Loyalty Points"
    SPLIT = "split", "Split Payment"
    CREDIT = "credit", "Credit"


class SaleStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"
    PARTIAL_REFUND = "partial_refund", "Partial Refund"


class Sale(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Business", on_delete=models.CASCADE, related_name="sales", db_index=True)
    shop = models.ForeignKey("tenants.Shop", on_delete=models.CASCADE, related_name="sales", db_index=True)
    cashier = models.ForeignKey("accounts.CustomUser", on_delete=models.SET_NULL, null=True, related_name="sales", db_index=True)
    customer = models.ForeignKey("customers.Customer", null=True, blank=True, on_delete=models.SET_NULL, related_name="purchases", db_index=True)
    receipt_number = models.CharField(max_length=50, unique=True, db_index=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    payment_method = models.CharField(max_length=30, choices=PaymentMethod.choices, default=PaymentMethod.CASH, db_index=True)
    status = models.CharField(max_length=20, choices=SaleStatus.choices, default=SaleStatus.COMPLETED, db_index=True)
    notes = models.TextField(blank=True)
    synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sales_sales"
        verbose_name = "Sale"
        verbose_name_plural = "Sales"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["shop", "created_at"]),
            models.Index(fields=["cashier", "created_at"]),
            models.Index(fields=["receipt_number"]),
        ]

    def __str__(self):
        return f"Sale {self.receipt_number} - {self.net_amount}"

    @property
    def item_count(self) -> int:
        return self.items.count()
