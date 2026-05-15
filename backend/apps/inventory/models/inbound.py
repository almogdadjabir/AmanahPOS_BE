import uuid

from django.db import models


class InboundTransaction(models.Model):
    """
    Header record for a supplier stock delivery.

    reference must be unique per tenant to enable idempotency checks.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Business",
        on_delete=models.CASCADE,
        related_name="inbound_transactions",
        db_index=True,
    )
    shop = models.ForeignKey(
        "tenants.Shop",
        on_delete=models.CASCADE,
        related_name="inbound_transactions",
        db_index=True,
    )
    vendor = models.ForeignKey(
        "inventory.Vendor",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="inbound_transactions",
        db_index=True,
    )
    reference = models.CharField(max_length=255)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.CustomUser",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="inbound_transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_inbound_transactions"
        verbose_name = "Inbound Transaction"
        verbose_name_plural = "Inbound Transactions"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "reference"], name="unique_inbound_ref_per_tenant"),
        ]
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["shop", "created_at"]),
        ]

    def __str__(self):
        return f"Inbound {self.reference} @ {self.shop}"


class InboundTransactionItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(
        InboundTransaction,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="inbound_items",
        db_index=True,
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    batch_number = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "inventory_inbound_transaction_items"
        verbose_name = "Inbound Transaction Item"
        verbose_name_plural = "Inbound Transaction Items"

    def __str__(self):
        return f"{self.product} x{self.quantity}"
