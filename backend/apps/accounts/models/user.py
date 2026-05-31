import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.accounts.managers import UserManager


class RoleChoices(models.TextChoices):
    OWNER = "owner", "Owner"
    MANAGER = "manager", "Manager"
    CASHIER = "cashier", "Cashier"


class CustomUser(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    email = models.EmailField(blank=True, null=True, unique=True, db_index=True)
    full_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=RoleChoices.choices, default=RoleChoices.CASHIER, db_index=True)
    business = models.ForeignKey(
        "tenants.Business",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="staff",
    )
    default_shop = models.ForeignKey(
        "tenants.Shop",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="default_users",
    )
    is_verified = models.BooleanField(default=False)
    has_password = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    language = models.CharField(
        max_length=5,
        choices=[("en", "English"), ("ar", "Arabic")],
        default="en",
        db_index=True,
    )

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table = "accounts_users"
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["phone"]),
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
            models.Index(fields=["business", "role"]),
            # Admin panel: filter owners (role, is_staff) + order/chart by created_at
            models.Index(fields=["is_staff"],        name="accounts_user_is_staff_idx"),
            models.Index(fields=["created_at"],      name="accounts_user_created_at_idx"),
            models.Index(fields=["role", "is_staff"], name="accounts_user_role_staff_idx"),
        ]

    def __str__(self):
        return f"{self.full_name or self.phone} ({self.role})"

    @property
    def display_name(self) -> str:
        return self.full_name or self.phone

    def mark_last_login(self):
        self.last_login_at = timezone.now()
        self.save(update_fields=["last_login_at"])

    def verify_phone(self):
        self.is_verified = True
        self.save(update_fields=["is_verified", "updated_at"])
