"""
Custom user manager for CustomUser.
"""
from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    """
    Manager for CustomUser using phone as the unique identifier.
    """

    def create_user(self, phone: str, password: str | None = None, **extra_fields):
        """
        Create and save a regular user with the given phone and optional password.
        """
        if not phone:
            raise ValueError("The phone number must be provided.")

        from apps.core.utils import format_phone
        phone = format_phone(phone)

        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", "cashier")

        user = self.model(phone=phone, **extra_fields)
        if password:
            user.set_password(password)
            user.has_password = True
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone: str, password: str, **extra_fields):
        """
        Create and save a superuser with the given phone and password.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_verified", True)
        extra_fields.setdefault("role", "owner")
        extra_fields.setdefault("has_password", True)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(phone, password, **extra_fields)

    def get_by_phone(self, phone: str):
        """Get a user by their phone number."""
        return self.get(phone=phone)

    def get_by_email(self, email: str):
        """Get a user by their email address."""
        return self.get(email__iexact=email)
