# Product Expiry Date Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shop-only product batch expiry tracking — model, API, Celery daily alerts, offline bootstrap, and tests.

**Architecture:** Introduce a `ProductBatch` model in `apps/inventory` (separate from `StockLevel`/`StockMovement`) that records a named batch of product with an expiry date. A daily Celery Beat task queries shop-type businesses only, sends push notifications for expiring-soon and expired batches via the existing `notify_user()` infra, and uses a `last_notified_date` field on the batch to deduplicate same-day alerts. Three new `NotificationSetting` keys control the feature globally.

**Tech Stack:** Django 5 + DRF, Celery, `apps.notifications.services.notify_user`, `apps.notifications.notification_templates.render_notification`, `BusinessType.SHOP` guard (mirrors existing `StockLevel` / offline patterns).

---

## File Map

| Status | File | Change |
|--------|------|--------|
| Create | `backend/apps/inventory/models/batch.py` | `ProductBatch` model |
| Modify | `backend/apps/inventory/models/__init__.py` | export `ProductBatch` |
| Create | `backend/apps/inventory/migrations/0005_productbatch.py` | migration |
| Modify | `backend/apps/inventory/serializers.py` | add `ProductBatchSerializer`, `ProductBatchWriteSerializer`, `ExpiryAlertSerializer` |
| Modify | `backend/apps/inventory/views.py` | add `BatchListView`, `BatchDetailView`, `ExpiryAlertsView` |
| Modify | `backend/apps/inventory/urls.py` | add batch + expiry-alerts routes |
| Create | `backend/apps/inventory/tasks.py` | `check_expiry_alerts` Celery task |
| Create | `backend/apps/inventory/tests/__init__.py` | empty |
| Create | `backend/apps/inventory/tests/test_expiry.py` | all tests |
| Modify | `backend/apps/notifications/notification_templates.py` | add `product_expiring_soon` + `product_expired` templates |
| Modify | `backend/apps/notifications/models/setting.py` | add 3 expiry keys to `ensure_defaults` |
| Modify | `backend/config/settings/base.py` | add `check-expiry-alerts` to `CELERY_BEAT_SCHEDULE` |
| Modify | `backend/apps/offline/serializers.py` | add `BootstrapBatchSerializer` |
| Modify | `backend/apps/offline/views.py` | add `expiry_batches` key to bootstrap (shop only) |
| Modify | `backend/docs/notifications.md` | document new feature |
| Modify | `backend/docs/BACKEND.md` | document new models + endpoints |

---

## Task 1: `ProductBatch` model + migration

**Files:**
- Create: `backend/apps/inventory/models/batch.py`
- Modify: `backend/apps/inventory/models/__init__.py`
- Create: `backend/apps/inventory/migrations/0005_productbatch.py`

- [ ] **Step 1: Write the failing test for the model**

```python
# backend/apps/inventory/tests/test_expiry.py
import uuid
from datetime import date, timedelta

from django.test import TestCase

from apps.accounts.models import CustomUser
from apps.tenants.models import Business, BusinessType, Shop
from apps.products.models import Product


def make_owner(phone="+249912111001"):
    return CustomUser.objects.create_user(phone=phone, full_name="Owner", role="owner")


def make_shop_business(owner, name="Shop Biz"):
    return Business.objects.create(name=name, owner=owner, business_type=BusinessType.SHOP)


def make_restaurant(owner, name="Restaurant Biz"):
    return Business.objects.create(name=name, owner=owner, business_type=BusinessType.RESTAURANT)


def make_shop(business, name="Main Shop"):
    return Shop.objects.create(name=name, business=business)


def make_product(tenant, name="Milk"):
    return Product.objects.create(
        tenant=tenant, name=name, price="1.00", track_inventory=True
    )


class ProductBatchModelTest(TestCase):
    def setUp(self):
        self.owner = make_owner()
        self.business = make_shop_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business)

    def test_create_batch(self):
        from apps.inventory.models import ProductBatch
        batch = ProductBatch.objects.create(
            product=self.product,
            shop=self.shop,
            quantity=50,
            expiry_date=date.today() + timedelta(days=10),
        )
        self.assertEqual(batch.product, self.product)
        self.assertIsNone(batch.last_notified_date)

    def test_batch_is_expired(self):
        from apps.inventory.models import ProductBatch
        batch = ProductBatch(expiry_date=date.today() - timedelta(days=1))
        self.assertTrue(batch.is_expired)

    def test_batch_is_expiring_soon_within_7_days(self):
        from apps.inventory.models import ProductBatch
        batch = ProductBatch(expiry_date=date.today() + timedelta(days=5))
        self.assertTrue(batch.is_expiring_soon(warning_days=7))

    def test_batch_not_expiring_soon_beyond_window(self):
        from apps.inventory.models import ProductBatch
        batch = ProductBatch(expiry_date=date.today() + timedelta(days=30))
        self.assertFalse(batch.is_expiring_soon(warning_days=7))
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry.ProductBatchModelTest -v 2
```
Expected: `ImportError: cannot import name 'ProductBatch'`

- [ ] **Step 3: Create `backend/apps/inventory/models/batch.py`**

```python
import uuid
from datetime import date

from django.db import models


class ProductBatch(models.Model):
    """
    A batch of product stock received on a specific date with an expiry date.

    Separate from StockLevel (which tracks total current quantity).
    Shop-only: restaurant businesses do not use expiry tracking.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product      = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="batches",
        db_index=True,
    )
    shop         = models.ForeignKey(
        "tenants.Shop",
        on_delete=models.CASCADE,
        related_name="product_batches",
        db_index=True,
    )
    quantity     = models.DecimalField(max_digits=12, decimal_places=3)
    expiry_date  = models.DateField(db_index=True)
    batch_number = models.CharField(max_length=100, blank=True)
    notes        = models.TextField(blank=True)
    last_notified_date = models.DateField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_product_batches"
        verbose_name = "Product Batch"
        verbose_name_plural = "Product Batches"
        ordering = ["expiry_date"]
        indexes = [
            models.Index(fields=["product", "shop", "expiry_date"]),
            models.Index(fields=["shop", "expiry_date"]),
        ]

    def __str__(self):
        return f"{self.product.name} @ {self.shop.name} expires {self.expiry_date}"

    @property
    def is_expired(self) -> bool:
        return self.expiry_date < date.today()

    def is_expiring_soon(self, warning_days: int = 7) -> bool:
        from datetime import timedelta
        today = date.today()
        return today <= self.expiry_date <= today + timedelta(days=warning_days)
```

- [ ] **Step 4: Update `backend/apps/inventory/models/__init__.py`**

```python
from .batch import ProductBatch
from .movement import MovementType, StockMovement
from .stock_level import StockLevel

__all__ = ["MovementType", "ProductBatch", "StockMovement", "StockLevel"]
```

- [ ] **Step 5: Create migration `backend/apps/inventory/migrations/0005_productbatch.py`**

```python
import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0004_alter_stockmovement_quantity_and_more"),
        ("products", "0004_image_fields"),
        ("tenants", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductBatch",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("quantity", models.DecimalField(decimal_places=3, max_digits=12)),
                ("expiry_date", models.DateField(db_index=True)),
                ("batch_number", models.CharField(blank=True, max_length=100)),
                ("notes", models.TextField(blank=True)),
                ("last_notified_date", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("product", models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name="batches", to="products.product")),
                ("shop", models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name="product_batches", to="tenants.shop")),
            ],
            options={
                "verbose_name": "Product Batch",
                "verbose_name_plural": "Product Batches",
                "db_table": "inventory_product_batches",
                "ordering": ["expiry_date"],
            },
        ),
        migrations.AddIndex(
            model_name="productbatch",
            index=models.Index(fields=["product", "shop", "expiry_date"], name="inv_batch_prod_shop_exp_idx"),
        ),
        migrations.AddIndex(
            model_name="productbatch",
            index=models.Index(fields=["shop", "expiry_date"], name="inv_batch_shop_exp_idx"),
        ),
    ]
```

- [ ] **Step 6: Run migration**

```bash
docker exec amanapos_app python manage.py migrate inventory
```
Expected: `Applying inventory.0005_productbatch... OK`

- [ ] **Step 7: Run tests — should pass now**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry.ProductBatchModelTest -v 2
```
Expected: 4 tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/inventory/models/batch.py \
        backend/apps/inventory/models/__init__.py \
        backend/apps/inventory/migrations/0005_productbatch.py \
        backend/apps/inventory/tests/__init__.py \
        backend/apps/inventory/tests/test_expiry.py
git commit -m "feat: add ProductBatch model with expiry_date + is_expired/is_expiring_soon"
```

---

## Task 2: Notification templates + settings defaults

**Files:**
- Modify: `backend/apps/notifications/notification_templates.py`
- Modify: `backend/apps/notifications/models/setting.py`

- [ ] **Step 1: Write failing test**

```python
# append to backend/apps/inventory/tests/test_expiry.py

class ExpiryTemplatesTest(TestCase):
    def test_product_expiring_soon_template(self):
        from apps.notifications.notification_templates import render_notification
        payload = render_notification(
            "product_expiring_soon",
            product_name="Milk 1L",
            shop_name="Main Branch",
            expiry_date="2026-05-20",
        )
        self.assertIn("Milk 1L", payload["body"])
        self.assertEqual(payload["notification_type"], "warning")

    def test_product_expired_template(self):
        from apps.notifications.notification_templates import render_notification
        payload = render_notification(
            "product_expired",
            product_name="Yogurt",
            shop_name="Branch 2",
            expiry_date="2026-05-10",
        )
        self.assertIn("Yogurt", payload["body"])
        self.assertEqual(payload["notification_type"], "error")

    def test_expiry_settings_defaults(self):
        from apps.notifications.models import NotificationSetting
        NotificationSetting.ensure_defaults()
        self.assertEqual(NotificationSetting.get("expiry_alert_enabled"), "true")
        self.assertEqual(NotificationSetting.get("expiry_warning_days"), "7")
        self.assertEqual(NotificationSetting.get("expired_alert_enabled"), "true")
```

- [ ] **Step 2: Run to confirm failure**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry.ExpiryTemplatesTest -v 2
```
Expected: `KeyError: Unknown notification template 'product_expiring_soon'`

- [ ] **Step 3: Add templates to `backend/apps/notifications/notification_templates.py`**

Add inside `_TEMPLATES` dict after the `"low_stock"` entry:

```python
    # ── Expiry ────────────────────────────────────────────────────────────────
    "product_expiring_soon": {
        "title": "Product Expiring Soon",
        "body": (
            "'{product_name}' at {shop_name} will expire on {expiry_date}. "
            "Check your inventory to avoid waste."
        ),
        "notification_type": "warning",
    },
    "product_expired": {
        "title": "Product Expired",
        "body": (
            "'{product_name}' at {shop_name} expired on {expiry_date}. "
            "Remove it from stock immediately."
        ),
        "notification_type": "error",
    },
```

- [ ] **Step 4: Add expiry keys to `NotificationSetting.ensure_defaults()` in `backend/apps/notifications/models/setting.py`**

Replace the `defaults` list inside `ensure_defaults`:

```python
    @classmethod
    def ensure_defaults(cls) -> None:
        """Seed default settings if they don't exist."""
        defaults = [
            ("push_enabled",          "true",  "Enable/disable all push notifications globally"),
            ("sms_enabled",           "true",  "Enable/disable all SMS notifications globally"),
            ("push_daily_limit",      "1000",  "Max push notifications sent per day"),
            ("sms_daily_limit",       "500",   "Max SMS messages sent per day"),
            ("expiry_alert_enabled",  "true",  "Send push when a product batch is expiring soon (shop businesses only)"),
            ("expiry_warning_days",   "7",     "Number of days before expiry to trigger the expiring-soon alert"),
            ("expired_alert_enabled", "true",  "Send push when a product batch has already expired (shop businesses only)"),
        ]
        for key, value, description in defaults:
            cls.objects.get_or_create(key=key, defaults={"value": value, "description": description})
```

- [ ] **Step 5: Run tests — should pass**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry.ExpiryTemplatesTest -v 2
```
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/notifications/notification_templates.py \
        backend/apps/notifications/models/setting.py \
        backend/apps/inventory/tests/test_expiry.py
git commit -m "feat: add product_expiring_soon + product_expired templates and expiry settings defaults"
```

---

## Task 3: Celery task `check_expiry_alerts`

**Files:**
- Create: `backend/apps/inventory/tasks.py`
- Modify: `backend/config/settings/base.py`

- [ ] **Step 1: Write failing tests**

```python
# append to backend/apps/inventory/tests/test_expiry.py
from unittest.mock import patch


class ExpiryAlertTaskTest(TestCase):
    def setUp(self):
        self.owner = make_owner("+249912111002")
        self.shop_biz = make_shop_business(self.owner, "Shop Biz")
        self.restaurant = make_restaurant(self.owner, "Restaurant")
        self.shop = make_shop(self.shop_biz)
        self.rest_shop = make_shop(self.restaurant, "Rest Shop")
        self.product = make_product(self.shop_biz)
        self.rest_product = make_product(self.restaurant, "Burger")

    @patch("apps.notifications.services.notify_user")
    def test_expiring_soon_sends_warning_notification(self, mock_notify):
        from datetime import date, timedelta
        from apps.inventory.models import ProductBatch
        from apps.notifications.models import NotificationSetting
        NotificationSetting.ensure_defaults()

        batch = ProductBatch.objects.create(
            product=self.product,
            shop=self.shop,
            quantity=10,
            expiry_date=date.today() + timedelta(days=3),
        )

        from apps.inventory.tasks import check_expiry_alerts
        check_expiry_alerts()

        mock_notify.assert_called_once()
        call_kwargs = mock_notify.call_args
        self.assertEqual(call_kwargs[1]["notification_type"], "warning")
        # batch last_notified_date updated
        batch.refresh_from_db()
        from django.utils import timezone
        self.assertEqual(batch.last_notified_date, timezone.now().date())

    @patch("apps.notifications.services.notify_user")
    def test_expired_sends_error_notification(self, mock_notify):
        from datetime import date, timedelta
        from apps.inventory.models import ProductBatch
        from apps.notifications.models import NotificationSetting
        NotificationSetting.ensure_defaults()

        ProductBatch.objects.create(
            product=self.product,
            shop=self.shop,
            quantity=10,
            expiry_date=date.today() - timedelta(days=2),
        )

        from apps.inventory.tasks import check_expiry_alerts
        check_expiry_alerts()

        mock_notify.assert_called_once()
        call_kwargs = mock_notify.call_args
        self.assertEqual(call_kwargs[1]["notification_type"], "error")

    @patch("apps.notifications.services.notify_user")
    def test_no_duplicate_notification_same_day(self, mock_notify):
        from datetime import date, timedelta
        from django.utils import timezone
        from apps.inventory.models import ProductBatch
        from apps.notifications.models import NotificationSetting
        NotificationSetting.ensure_defaults()

        ProductBatch.objects.create(
            product=self.product,
            shop=self.shop,
            quantity=10,
            expiry_date=date.today() + timedelta(days=3),
            last_notified_date=timezone.now().date(),  # already notified today
        )

        from apps.inventory.tasks import check_expiry_alerts
        check_expiry_alerts()
        mock_notify.assert_not_called()

    @patch("apps.notifications.services.notify_user")
    def test_restaurant_business_skipped(self, mock_notify):
        from datetime import date, timedelta
        from apps.inventory.models import ProductBatch
        from apps.notifications.models import NotificationSetting
        NotificationSetting.ensure_defaults()

        ProductBatch.objects.create(
            product=self.rest_product,
            shop=self.rest_shop,
            quantity=5,
            expiry_date=date.today() + timedelta(days=2),
        )

        from apps.inventory.tasks import check_expiry_alerts
        check_expiry_alerts()
        mock_notify.assert_not_called()

    @patch("apps.notifications.services.notify_user")
    def test_disabled_setting_prevents_notification(self, mock_notify):
        from datetime import date, timedelta
        from apps.inventory.models import ProductBatch
        from apps.notifications.models import NotificationSetting
        NotificationSetting.ensure_defaults()
        NotificationSetting.objects.filter(key="expiry_alert_enabled").update(value="false")
        NotificationSetting.objects.filter(key="expired_alert_enabled").update(value="false")

        ProductBatch.objects.create(
            product=self.product,
            shop=self.shop,
            quantity=10,
            expiry_date=date.today() + timedelta(days=2),
        )

        from apps.inventory.tasks import check_expiry_alerts
        check_expiry_alerts()
        mock_notify.assert_not_called()
```

- [ ] **Step 2: Run to confirm failure**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry.ExpiryAlertTaskTest -v 2
```
Expected: `ModuleNotFoundError: No module named 'apps.inventory.tasks'`

- [ ] **Step 3: Create `backend/apps/inventory/tasks.py`**

```python
"""
Celery tasks for inventory.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name="apps.inventory.tasks.check_expiry_alerts",
    queue="notifications",
)
def check_expiry_alerts() -> None:
    """
    Daily task: find product batches that are expired or expiring soon,
    send push notification to the business owner.

    Only runs for SHOP business type. Skips RESTAURANT.
    Deduplicates: skips batches where last_notified_date == today.
    Respects NotificationSetting keys: expiry_alert_enabled,
    expiry_warning_days, expired_alert_enabled.
    """
    from datetime import timedelta

    from django.utils import timezone

    from apps.notifications.models import NotificationSetting
    from apps.notifications.notification_templates import render_notification
    from apps.notifications.services import notify_user
    from apps.tenants.models import BusinessType

    from .models import ProductBatch

    today = timezone.now().date()

    expiry_enabled  = NotificationSetting.get_bool("expiry_alert_enabled",  True)
    expired_enabled = NotificationSetting.get_bool("expired_alert_enabled", True)

    if not expiry_enabled and not expired_enabled:
        logger.info("check_expiry_alerts: all expiry notifications disabled — skipping.")
        return

    try:
        warning_days = int(NotificationSetting.get("expiry_warning_days", "7"))
    except ValueError:
        warning_days = 7

    warning_cutoff = today + timedelta(days=warning_days)

    # Single query: all batches whose expiry_date <= cutoff, shop businesses only,
    # not yet notified today.
    batches = (
        ProductBatch.objects
        .filter(
            expiry_date__lte=warning_cutoff,
            shop__business__business_type=BusinessType.SHOP,
        )
        .exclude(last_notified_date=today)
        .select_related("product", "shop", "shop__business", "shop__business__owner")
        .order_by("expiry_date")
    )

    notified = 0
    for batch in batches:
        owner = batch.shop.business.owner
        expiry_str = batch.expiry_date.strftime("%Y-%m-%d")

        try:
            if batch.expiry_date < today:
                if not expired_enabled:
                    continue
                payload = render_notification(
                    "product_expired",
                    product_name=batch.product.name,
                    shop_name=batch.shop.name,
                    expiry_date=expiry_str,
                )
            else:
                if not expiry_enabled:
                    continue
                payload = render_notification(
                    "product_expiring_soon",
                    product_name=batch.product.name,
                    shop_name=batch.shop.name,
                    expiry_date=expiry_str,
                )

            notify_user(
                user=owner,
                title=payload["title"],
                body=payload["body"],
                notification_type=payload["notification_type"],
                data={
                    "type":       payload["notification_type"],
                    "product_id": str(batch.product_id),
                    "shop_id":    str(batch.shop_id),
                    "batch_id":   str(batch.id),
                    "expiry_date": expiry_str,
                },
            )

            batch.last_notified_date = today
            batch.save(update_fields=["last_notified_date", "updated_at"])
            notified += 1

        except Exception as exc:
            logger.error(
                "check_expiry_alerts: failed for batch %s: %s", batch.id, exc
            )

    logger.info("check_expiry_alerts: sent %d expiry notifications.", notified)
```

- [ ] **Step 4: Add to Beat schedule in `backend/config/settings/base.py`**

Add inside `CELERY_BEAT_SCHEDULE`:

```python
    "check-expiry-alerts": {
        "task": "apps.inventory.tasks.check_expiry_alerts",
        "schedule": 86400.0,  # daily
    },
```

- [ ] **Step 5: Run tests — should pass**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry.ExpiryAlertTaskTest -v 2
```
Expected: 5 tests pass.

- [ ] **Step 6: Restart Celery worker + beat so new task is discovered**

```bash
docker restart amanapos_celery_worker amanapos_celery_beat
sleep 6
docker logs amanapos_celery_worker --tail 20 2>&1 | grep "expiry\|tasks\]"
```
Expected: `apps.inventory.tasks.check_expiry_alerts` appears in `[tasks]`.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/inventory/tasks.py \
        backend/config/settings/base.py \
        backend/apps/inventory/tests/test_expiry.py
git commit -m "feat: add check_expiry_alerts Celery task + beat schedule"
```

---

## Task 4: Serializers for `ProductBatch`

**Files:**
- Modify: `backend/apps/inventory/serializers.py`

- [ ] **Step 1: Write failing test**

```python
# append to backend/apps/inventory/tests/test_expiry.py

class ProductBatchSerializerTest(TestCase):
    def setUp(self):
        self.owner = make_owner("+249912111003")
        self.business = make_shop_business(self.owner, "Biz Ser")
        self.shop = make_shop(self.business, "Ser Shop")
        self.product = make_product(self.business, "Cheese")

    def test_write_serializer_valid(self):
        from datetime import date, timedelta
        from apps.inventory.serializers import ProductBatchWriteSerializer
        data = {
            "product": str(self.product.id),
            "shop": str(self.shop.id),
            "quantity": "25.000",
            "expiry_date": str(date.today() + timedelta(days=20)),
            "batch_number": "BATCH-001",
        }
        s = ProductBatchWriteSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)

    def test_write_serializer_rejects_past_expiry(self):
        from datetime import date, timedelta
        from apps.inventory.serializers import ProductBatchWriteSerializer
        data = {
            "product": str(self.product.id),
            "shop": str(self.shop.id),
            "quantity": "10.000",
            "expiry_date": str(date.today() - timedelta(days=1)),
        }
        s = ProductBatchWriteSerializer(data=data)
        self.assertFalse(s.is_valid())
        self.assertIn("expiry_date", s.errors)

    def test_read_serializer_includes_is_expired(self):
        from datetime import date, timedelta
        from apps.inventory.models import ProductBatch
        from apps.inventory.serializers import ProductBatchSerializer
        batch = ProductBatch.objects.create(
            product=self.product, shop=self.shop, quantity=5,
            expiry_date=date.today() - timedelta(days=1),
        )
        data = ProductBatchSerializer(batch).data
        self.assertTrue(data["is_expired"])
```

- [ ] **Step 2: Run to confirm failure**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry.ProductBatchSerializerTest -v 2
```
Expected: `ImportError: cannot import name 'ProductBatchWriteSerializer'`

- [ ] **Step 3: Add serializers to `backend/apps/inventory/serializers.py`**

Append at the end of the file:

```python
from .models import ProductBatch


class ProductBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    shop_name    = serializers.CharField(source="shop.name",    read_only=True)
    is_expired   = serializers.BooleanField(read_only=True)

    class Meta:
        model  = ProductBatch
        fields = [
            "id", "product", "product_name", "shop", "shop_name",
            "quantity", "expiry_date", "batch_number", "notes",
            "is_expired", "last_notified_date",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "last_notified_date", "created_at", "updated_at"]


class ProductBatchWriteSerializer(serializers.Serializer):
    product      = serializers.UUIDField()
    shop         = serializers.UUIDField()
    quantity     = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=0)
    expiry_date  = serializers.DateField()
    batch_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    notes        = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_expiry_date(self, value):
        from datetime import date
        if value < date.today():
            raise serializers.ValidationError("Expiry date must be today or in the future.")
        return value


class ExpiryAlertSerializer(serializers.ModelSerializer):
    product_name    = serializers.CharField(source="product.name",         read_only=True)
    product_sku     = serializers.CharField(source="product.sku",          read_only=True)
    shop_name       = serializers.CharField(source="shop.name",            read_only=True)
    business_name   = serializers.CharField(source="shop.business.name",   read_only=True)
    is_expired      = serializers.BooleanField(read_only=True)

    class Meta:
        model  = ProductBatch
        fields = [
            "id", "product", "product_name", "product_sku",
            "shop", "shop_name", "business_name",
            "quantity", "expiry_date", "batch_number",
            "is_expired", "created_at",
        ]
```

- [ ] **Step 4: Run tests — should pass**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry.ProductBatchSerializerTest -v 2
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/inventory/serializers.py backend/apps/inventory/tests/test_expiry.py
git commit -m "feat: add ProductBatch serializers (read/write/expiry-alert)"
```

---

## Task 5: Batch API views + URLs

**Files:**
- Modify: `backend/apps/inventory/views.py`
- Modify: `backend/apps/inventory/urls.py`

- [ ] **Step 1: Write failing API tests**

```python
# append to backend/apps/inventory/tests/test_expiry.py
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


def api_client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(user).access_token)}")
    return c


class BatchAPITest(TestCase):
    def setUp(self):
        self.owner = make_owner("+249912111004")
        self.business = make_shop_business(self.owner, "API Biz")
        self.shop = make_shop(self.business, "API Shop")
        self.product = make_product(self.business, "Oil")
        self.client = api_client(self.owner)
        # required: tenant header
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(self.owner).access_token)}",
        )

    def _auth_headers(self):
        return {"HTTP_X_TENANT_ID": str(self.business.id)}

    def test_create_batch(self):
        from datetime import date, timedelta
        res = self.client.post(
            "/api/v1/inventory/batches/",
            {
                "product": str(self.product.id),
                "shop": str(self.shop.id),
                "quantity": "20.000",
                "expiry_date": str(date.today() + timedelta(days=30)),
                "batch_number": "B001",
            },
            format="json",
            **self._auth_headers(),
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["data"]["batch_number"], "B001")

    def test_list_batches(self):
        from datetime import date, timedelta
        from apps.inventory.models import ProductBatch
        ProductBatch.objects.create(
            product=self.product, shop=self.shop, quantity=5,
            expiry_date=date.today() + timedelta(days=5),
        )
        res = self.client.get("/api/v1/inventory/batches/", **self._auth_headers())
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data["count"], 1)

    def test_expiry_alerts_returns_expiring_and_expired(self):
        from datetime import date, timedelta
        from apps.inventory.models import ProductBatch
        ProductBatch.objects.create(
            product=self.product, shop=self.shop, quantity=5,
            expiry_date=date.today() + timedelta(days=3),
        )
        ProductBatch.objects.create(
            product=self.product, shop=self.shop, quantity=2,
            expiry_date=date.today() - timedelta(days=1),
        )
        res = self.client.get("/api/v1/inventory/expiry-alerts/", **self._auth_headers())
        self.assertEqual(res.status_code, 200)
        self.assertIn("expiring_soon", res.data["data"])
        self.assertIn("expired", res.data["data"])
        self.assertEqual(len(res.data["data"]["expiring_soon"]), 1)
        self.assertEqual(len(res.data["data"]["expired"]), 1)

    def test_restaurant_cannot_create_batch(self):
        from datetime import date, timedelta
        rest_owner = make_owner("+249912111009")
        rest_biz = make_restaurant(rest_owner, "Rest Biz")
        rest_shop = make_shop(rest_biz, "Rest Shop")
        rest_product = make_product(rest_biz, "Pasta")
        c = api_client(rest_owner)
        res = c.post(
            "/api/v1/inventory/batches/",
            {
                "product": str(rest_product.id),
                "shop": str(rest_shop.id),
                "quantity": "10.000",
                "expiry_date": str(date.today() + timedelta(days=10)),
            },
            format="json",
            **{"HTTP_X_TENANT_ID": str(rest_biz.id)},
        )
        self.assertEqual(res.status_code, 403, res.data)

    def test_tenant_isolation_other_business_batch_invisible(self):
        from datetime import date, timedelta
        from apps.inventory.models import ProductBatch
        other_owner = make_owner("+249912111005")
        other_biz   = make_shop_business(other_owner, "Other Biz")
        other_shop  = make_shop(other_biz, "Other Shop")
        other_prod  = make_product(other_biz, "Widget")
        ProductBatch.objects.create(
            product=other_prod, shop=other_shop, quantity=5,
            expiry_date=date.today() + timedelta(days=5),
        )
        res = self.client.get("/api/v1/inventory/batches/", **self._auth_headers())
        self.assertEqual(res.status_code, 200)
        for item in res.data["results"]:
            self.assertNotEqual(item["shop"], str(other_shop.id))
```

- [ ] **Step 2: Run to confirm failure**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry.BatchAPITest -v 2
```
Expected: `404` (routes not registered yet)

- [ ] **Step 3: Add views to `backend/apps/inventory/views.py`**

Append at end of file:

```python
from .models import ProductBatch
from .serializers import ProductBatchSerializer, ProductBatchWriteSerializer, ExpiryAlertSerializer


class BatchListView(APIView):
    """
    GET  /api/v1/inventory/batches/   — list batches for tenant (shop only)
    POST /api/v1/inventory/batches/   — create a batch
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if tenant.business_type == BusinessType.RESTAURANT:
            paginator = StandardPagination()
            paginator.paginate_queryset([], request)
            return paginator.get_paginated_response([])

        qs = (
            ProductBatch.objects
            .filter(product__tenant=tenant)
            .select_related("product", "shop")
            .order_by("expiry_date")
        )

        shop_id = request.query_params.get("shop")
        if shop_id:
            qs = qs.filter(shop_id=shop_id)

        product_id = request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(ProductBatchSerializer(page, many=True).data)

    def post(self, request):
        tenant = get_tenant_from_request(request)
        if tenant.business_type == BusinessType.RESTAURANT:
            return Response(
                {"success": False, "message": "Expiry tracking is not available for restaurant businesses."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ProductBatchWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        try:
            product = Product.objects.get(pk=vd["product"], tenant=tenant)
        except Product.DoesNotExist:
            raise NotFound("Product not found.")

        try:
            shop = Shop.objects.get(pk=vd["shop"], business=tenant)
        except Shop.DoesNotExist:
            raise NotFound("Shop not found.")

        batch = ProductBatch.objects.create(
            product=product,
            shop=shop,
            quantity=vd["quantity"],
            expiry_date=vd["expiry_date"],
            batch_number=vd.get("batch_number", ""),
            notes=vd.get("notes", ""),
        )
        return Response(
            {"success": True, "data": ProductBatchSerializer(batch).data},
            status=status.HTTP_201_CREATED,
        )


class BatchDetailView(APIView):
    """
    GET    /api/v1/inventory/batches/<pk>/
    PATCH  /api/v1/inventory/batches/<pk>/
    DELETE /api/v1/inventory/batches/<pk>/
    """
    permission_classes = [IsAuthenticated]

    def _get_batch(self, pk, tenant):
        try:
            return ProductBatch.objects.select_related("product", "shop").get(
                pk=pk, product__tenant=tenant
            )
        except ProductBatch.DoesNotExist:
            raise NotFound("Batch not found.")

    def get(self, request, pk):
        tenant = get_tenant_from_request(request)
        batch = self._get_batch(pk, tenant)
        return Response({"success": True, "data": ProductBatchSerializer(batch).data})

    def patch(self, request, pk):
        tenant = get_tenant_from_request(request)
        if tenant.business_type == BusinessType.RESTAURANT:
            return Response(
                {"success": False, "message": "Expiry tracking is not available for restaurant businesses."},
                status=status.HTTP_403_FORBIDDEN,
            )
        batch = self._get_batch(pk, tenant)
        serializer = ProductBatchWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        for field in ("quantity", "expiry_date", "batch_number", "notes"):
            if field in vd:
                setattr(batch, field, vd[field])
        batch.save()
        return Response({"success": True, "data": ProductBatchSerializer(batch).data})

    def delete(self, request, pk):
        tenant = get_tenant_from_request(request)
        batch = self._get_batch(pk, tenant)
        batch.delete()
        return Response({"success": True, "message": "Batch deleted."})


class ExpiryAlertsView(APIView):
    """
    GET /api/v1/inventory/expiry-alerts/

    Returns two lists:
      - expiring_soon: batches whose expiry_date is within the configured warning window
      - expired: batches whose expiry_date is in the past

    Respects expiry_warning_days NotificationSetting.
    Shop businesses only — returns empty lists for restaurants.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta

        from django.utils import timezone

        from apps.notifications.models import NotificationSetting

        tenant = get_tenant_from_request(request)

        if tenant.business_type == BusinessType.RESTAURANT:
            return Response({"success": True, "data": {"expiring_soon": [], "expired": []}})

        today = timezone.now().date()
        try:
            warning_days = int(NotificationSetting.get("expiry_warning_days", "7"))
        except ValueError:
            warning_days = 7
        warning_cutoff = today + timedelta(days=warning_days)

        base_qs = (
            ProductBatch.objects
            .filter(product__tenant=tenant)
            .select_related("product", "shop", "shop__business")
        )

        expiring_soon = base_qs.filter(expiry_date__gte=today, expiry_date__lte=warning_cutoff)
        expired       = base_qs.filter(expiry_date__lt=today)

        return Response({
            "success": True,
            "data": {
                "expiring_soon": ExpiryAlertSerializer(expiring_soon, many=True).data,
                "expired":       ExpiryAlertSerializer(expired,       many=True).data,
            },
        })
```

- [ ] **Step 4: Add routes to `backend/apps/inventory/urls.py`**

```python
from django.urls import path
from . import views

app_name = "inventory"

urlpatterns = [
    path("stock/",            views.StockLevelListView.as_view(),    name="stock_list"),
    path("movements/",        views.StockMovementListView.as_view(), name="movement_list"),
    path("stock/add/",        views.StockAddView.as_view(),          name="stock_add"),
    path("stock/adjust/",     views.StockAdjustView.as_view(),       name="stock_adjust"),
    path("stock/transfer/",   views.StockTransferView.as_view(),     name="stock_transfer"),
    path("batches/",          views.BatchListView.as_view(),         name="batch_list"),
    path("batches/<uuid:pk>/",views.BatchDetailView.as_view(),       name="batch_detail"),
    path("expiry-alerts/",    views.ExpiryAlertsView.as_view(),      name="expiry_alerts"),
]
```

- [ ] **Step 5: Run API tests**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry.BatchAPITest -v 2
```
Expected: all 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/inventory/views.py \
        backend/apps/inventory/urls.py \
        backend/apps/inventory/tests/test_expiry.py
git commit -m "feat: add batch CRUD API and expiry-alerts endpoint"
```

---

## Task 6: Offline bootstrap — include expiry batches

**Files:**
- Modify: `backend/apps/offline/serializers.py`
- Modify: `backend/apps/offline/views.py`

- [ ] **Step 1: Write failing test**

```python
# append to backend/apps/inventory/tests/test_expiry.py

class BootstrapExpiryTest(TestCase):
    def setUp(self):
        self.owner = make_owner("+249912111006")
        self.shop_biz = make_shop_business(self.owner, "Bootstrap Shop")
        self.shop = make_shop(self.shop_biz, "BS Shop")
        self.product = make_product(self.shop_biz, "Cream")
        self.rest_owner = make_owner("+249912111007")
        self.rest_biz = make_restaurant(self.rest_owner, "Bootstrap Rest")

    def test_bootstrap_includes_expiry_batches_for_shop(self):
        from datetime import date, timedelta
        from apps.inventory.models import ProductBatch
        ProductBatch.objects.create(
            product=self.product, shop=self.shop, quantity=10,
            expiry_date=date.today() + timedelta(days=15),
        )
        c = api_client(self.owner)
        res = c.get(
            "/api/v1/offline/bootstrap/",
            HTTP_X_TENANT_ID=str(self.shop_biz.id),
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("expiry_batches", res.data)
        self.assertEqual(len(res.data["expiry_batches"]), 1)

    def test_bootstrap_expiry_batches_empty_for_restaurant(self):
        c = api_client(self.rest_owner)
        res = c.get(
            "/api/v1/offline/bootstrap/",
            HTTP_X_TENANT_ID=str(self.rest_biz.id),
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["expiry_batches"], [])
```

- [ ] **Step 2: Run to confirm failure**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry.BootstrapExpiryTest -v 2
```
Expected: `AssertionError: 'expiry_batches' not found in response`

- [ ] **Step 3: Add serializer to `backend/apps/offline/serializers.py`**

Append at the end of the file:

```python
from apps.inventory.models import ProductBatch


class BootstrapBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    shop_name    = serializers.CharField(source="shop.name",    read_only=True)
    is_expired   = serializers.BooleanField(read_only=True)

    class Meta:
        model  = ProductBatch
        fields = [
            "id", "product", "product_name", "shop", "shop_name",
            "quantity", "expiry_date", "batch_number", "is_expired", "updated_at",
        ]
```

- [ ] **Step 4: Update `backend/apps/offline/views.py` bootstrap**

At the top of `BootstrapView.get`, after the existing imports block, add the import of the new serializer (inside the function to follow the existing lazy-import pattern or add to the top imports — follow the file's existing style).

In `BootstrapView.get`, after `stock_data` is built, add:

```python
        # Expiry batches — shop businesses only
        from apps.inventory.models import ProductBatch
        from .serializers import BootstrapBatchSerializer
        if tenant.business_type == BusinessType.RESTAURANT:
            expiry_batches_data = []
        elif user.role == "cashier" and user.default_shop_id:
            batch_qs = ProductBatch.objects.filter(
                product__tenant=tenant, shop_id=user.default_shop_id
            ).select_related("product", "shop")
            expiry_batches_data = BootstrapBatchSerializer(batch_qs, many=True, context=ctx).data
        else:
            batch_qs = ProductBatch.objects.filter(
                product__tenant=tenant
            ).select_related("product", "shop")
            expiry_batches_data = BootstrapBatchSerializer(batch_qs, many=True, context=ctx).data
```

And add `"expiry_batches": expiry_batches_data` to the `data` dict.

The full updated `data` dict becomes:

```python
        data = {
            "success": True,
            "server_time": timezone.now().isoformat(),
            "businesses": BootstrapBusinessSerializer([tenant], many=True, context=ctx).data,
            "shops": BootstrapShopSerializer(shops, many=True, context=ctx).data,
            "categories": BootstrapCategorySerializer(categories, many=True, context=ctx).data,
            "products": BootstrapProductSerializer(products, many=True, context=ctx).data,
            "customers": BootstrapCustomerSerializer(customers, many=True, context=ctx).data,
            "stock": stock_data,
            "expiry_batches": expiry_batches_data,
            "active_subscription": (
                BootstrapSubscriptionSerializer(active_subscription, context=ctx).data
                if active_subscription else None
            ),
        }
```

- [ ] **Step 5: Run tests**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry.BootstrapExpiryTest -v 2
```
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/offline/serializers.py \
        backend/apps/offline/views.py \
        backend/apps/inventory/tests/test_expiry.py
git commit -m "feat: include expiry_batches in offline bootstrap (shop only)"
```

---

## Task 7: Run full test suite and restart services

- [ ] **Step 1: Run all expiry tests together**

```bash
docker exec amanapos_app python manage.py test apps.inventory.tests.test_expiry -v 2
```
Expected: all tests pass (ProductBatchModelTest × 4, ExpiryTemplatesTest × 3, ExpiryAlertTaskTest × 5, ProductBatchSerializerTest × 3, BatchAPITest × 5, BootstrapExpiryTest × 2 = **22 tests pass**).

- [ ] **Step 2: Run existing notification tests (regression check)**

```bash
docker exec amanapos_app python manage.py test apps.notifications.tests -v 2
```
Expected: all pass, no regressions.

- [ ] **Step 3: Restart Celery worker + beat**

```bash
docker restart amanapos_celery_worker amanapos_celery_beat
sleep 6
docker logs amanapos_celery_worker --tail 5 2>&1 | grep "ready\|expiry"
```

- [ ] **Step 4: Commit (if any final fixes were needed)**

```bash
git add -p
git commit -m "fix: expiry feature integration fixes"
```

---

## Task 8: Documentation update

**Files:**
- Modify: `backend/docs/notifications.md`
- Modify: `backend/docs/BACKEND.md`

- [ ] **Step 1: Add expiry section to `docs/notifications.md`**

Append a new section after the existing "Adding a New Notification" section:

```markdown
---

## Product Expiry Alerts

Shop-only feature. Skipped entirely for `business_type=restaurant`.

### Settings

| Key | Default | Description |
|-----|---------|-------------|
| `expiry_alert_enabled` | `"true"` | Send push for batches expiring within the warning window |
| `expiry_warning_days` | `"7"` | Days before expiry that triggers the "expiring soon" alert |
| `expired_alert_enabled` | `"true"` | Send push for batches that have already expired |

Managed via `GET/PATCH /api/v1/admin/notifications/settings/`.

### Notification Templates

| Template key | Type | Placeholders |
|---|---|---|
| `product_expiring_soon` | `warning` | `{product_name}`, `{shop_name}`, `{expiry_date}` |
| `product_expired` | `error` | `{product_name}`, `{shop_name}`, `{expiry_date}` |

### Celery Task

`apps.inventory.tasks.check_expiry_alerts` — runs daily on the `notifications` queue.

**Logic:**
1. Read settings: `expiry_alert_enabled`, `expired_alert_enabled`, `expiry_warning_days`
2. Query all `ProductBatch` records where `expiry_date ≤ today + warning_days` AND `shop.business.business_type = SHOP` AND `last_notified_date ≠ today`
3. For each: send `product_expired` (error) or `product_expiring_soon` (warning) to the business owner via `notify_user()`
4. Set `batch.last_notified_date = today` to prevent same-day duplicates

### Mobile Integration Guide

**Endpoints your app needs:**

| Method | Endpoint | When to call |
|--------|----------|-------------|
| `GET` | `/api/v1/offline/bootstrap/` | On login/refresh — includes `expiry_batches[]` for shop businesses |
| `GET` | `/api/v1/inventory/expiry-alerts/` | On demand (inventory screen) |
| `GET` | `/api/v1/inventory/batches/` | Batch list (paginated, filter by `?shop=` or `?product=`) |
| `POST` | `/api/v1/inventory/batches/` | When receiving new stock — record batch + expiry date |
| `PATCH` | `/api/v1/inventory/batches/<id>/` | Edit expiry date or quantity |
| `DELETE` | `/api/v1/inventory/batches/<id>/` | Remove a batch |

**Bootstrap response — `expiry_batches` key:**

```json
"expiry_batches": [
  {
    "id": "uuid",
    "product": "product-uuid",
    "product_name": "Milk 1L",
    "shop": "shop-uuid",
    "shop_name": "Main Branch",
    "quantity": "50.000",
    "expiry_date": "2026-05-19",
    "batch_number": "BATCH-001",
    "is_expired": false,
    "updated_at": "2026-05-12T10:00:00Z"
  }
]
```
Empty array `[]` for restaurant businesses.

**Expiry alerts response:**

```json
{
  "success": true,
  "data": {
    "expiring_soon": [
      {
        "id": "uuid",
        "product_name": "Milk 1L",
        "shop_name": "Main Branch",
        "business_name": "My Shop",
        "quantity": "50.000",
        "expiry_date": "2026-05-17",
        "batch_number": "BATCH-001",
        "is_expired": false
      }
    ],
    "expired": [...]
  }
}
```

**How to show alerts in app:**
1. On login: check `expiry_batches` from bootstrap. Count `is_expired=true` and those within 7 days for a badge/alert indicator.
2. On inventory screen: call `GET /api/v1/inventory/expiry-alerts/` for a live list.
3. Push notifications: the daily Celery task sends push via FCM — existing notification handlers apply.
4. Unread count: expiry push notifications appear in `GET /api/v1/notifications/unread-count/` like any other notification.

**Create batch when receiving stock:**

```json
POST /api/v1/inventory/batches/
Headers: Authorization: Bearer <token>, X-Tenant-ID: <business_id>
{
  "product": "product-uuid",
  "shop": "shop-uuid",
  "quantity": "50.000",
  "expiry_date": "2026-06-15",
  "batch_number": "BATCH-001",
  "notes": "Received from supplier X"
}
```

Response `201`:
```json
{
  "success": true,
  "data": { "id": "batch-uuid", ... }
}
```

**Guards:**
- Restaurant businesses: `POST /api/v1/inventory/batches/` returns `403`
- `expiry_batches` in bootstrap is `[]` for restaurants
- `/api/v1/inventory/expiry-alerts/` returns empty lists for restaurants
```

- [ ] **Step 2: Update `docs/BACKEND.md` inventory section**

In the inventory section, update the endpoints table to add the new routes:

```markdown
| `GET/POST` | `batches/` | List/create product batches (expiry tracking, shop only) |
| `GET/PATCH/DELETE` | `batches/<id>/` | Batch detail |
| `GET` | `expiry-alerts/` | Expiring-soon and expired batches (shop only) |
```

Also add a `ProductBatch` row to the inventory models table:

```markdown
| `ProductBatch` | `product` FK, `shop` FK, `quantity`, `expiry_date`, `batch_number`, `notes`, `last_notified_date` |
```

Add to the Celery Beat table:

```markdown
| `apps.inventory.tasks.check_expiry_alerts` | Daily | Send expiry push alerts (shop businesses only) |
```

- [ ] **Step 3: Commit**

```bash
git add docs/notifications.md docs/BACKEND.md
git commit -m "docs: document product expiry feature, mobile integration guide, API examples"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|---|---|
| Batch/expiry model | Task 1 |
| Shop-only guard | Task 1 model, Task 3 task, Task 5 views |
| NotificationSetting keys | Task 2 |
| Expiring-soon notification | Task 3 |
| Expired notification | Task 3 |
| Duplicate prevention | Task 3 (`last_notified_date`) |
| Celery Beat daily task | Task 3 |
| Batch CRUD API | Task 5 |
| Expiry alerts API | Task 5 |
| Offline bootstrap | Task 6 |
| Tenant isolation | Task 5 test |
| Restaurant skipped | Task 3 + 5 tests |
| Mobile integration guide | Task 8 |
| Tests | Tasks 1-6 |
| Docs | Task 8 |

**No placeholders — every step has actual code. Type consistency verified: `ProductBatch`, `ProductBatchSerializer`, `ProductBatchWriteSerializer`, `ExpiryAlertSerializer`, `BootstrapBatchSerializer`, `check_expiry_alerts` are consistent throughout. `notify_user` call signature matches `apps.notifications.services.notify_user(user, title, body, notification_type, data)`.**
