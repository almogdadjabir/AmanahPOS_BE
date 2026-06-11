import uuid
from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify


class BusinessType(models.TextChoices):
    SHOP       = "shop",       "Shop"
    RESTAURANT = "restaurant", "Restaurant"


class Business(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    business_type = models.CharField(
        max_length=20,
        choices=BusinessType.choices,
        default=BusinessType.SHOP,
        db_index=True,
    )
    slug = models.SlugField(max_length=255, unique=True, db_index=True, blank=True)
    owner = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.PROTECT,
        related_name="businesses",
        db_index=True,
    )
    logo = models.ImageField(upload_to="businesses/logos/", blank=True, null=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    subscription_plan = models.ForeignKey(
        "subscriptions.Plan",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="businesses",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    currency = models.CharField(max_length=10, default="SDG", blank=True)
    timezone = models.CharField(max_length=60, default="Africa/Khartoum", blank=True)
    tax_enabled = models.BooleanField(default=False)
    tax_name = models.CharField(max_length=50, default="VAT")
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("100"))],
    )
    tax_inclusive = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenants_businesses"
        verbose_name = "Business"
        verbose_name_plural = "Businesses"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "is_active"]),
            models.Index(fields=["created_at"], name="biz_created_at_idx"),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Business.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def active_subscription(self):
        return self.subscriptions.filter(is_active=True).select_related("plan").first()

    @property
    def shop_count(self) -> int:
        if hasattr(self, '_shop_count'):
            return self._shop_count
        return self.shops.filter(is_active=True).count()

    @shop_count.setter
    def shop_count(self, value: int) -> None:
        self._shop_count = value
