import uuid

from django.core.validators import RegexValidator
from django.db import models

_account_number_validator = RegexValidator(
    regex=r'^[\w\s\-]{4,50}$',
    message="Account number must be 4–50 characters (letters, digits, spaces, hyphens).",
)


class BankakAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="bankak_accounts",
        db_index=True,
    )
    account_number = models.CharField(
        max_length=50,
        validators=[_account_number_validator],
    )
    is_default = models.BooleanField(default=True, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_bankak_accounts"
        verbose_name = "Bankak Account"
        verbose_name_plural = "Bankak Accounts"
        ordering = ["-is_default", "-created_at"]
        indexes = [
            models.Index(fields=["owner", "is_default"], name="bankak_owner_default_idx"),
            models.Index(fields=["owner", "is_active"], name="bankak_owner_active_idx"),
        ]

    def __str__(self):
        tag = "default" if self.is_default else "alt"
        return f"Bankak {self.account_number} ({tag}) – {self.owner}"
