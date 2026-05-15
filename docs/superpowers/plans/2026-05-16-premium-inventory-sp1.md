# Premium Inventory Sub-project 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken inbound form (add vendor selector + vendor_id in POST) and add three backend report foundation endpoints — `premium-summary/`, `inbound/<id>/`, and `reports/expiry/` — all feature-gated by `inventory_inbound_receiving`.

**Architecture:** Backend-first — add performance indexes migration, update existing `InboundTransactionSerializer` to expose `created_by_name`, add `ExpiryBatchSerializer`, and implement three new feature-gated views. Frontend adds `Vendor`/`PremiumInventorySummary` types, vendor i18n keys, four new server actions (one of which unblocks the broken form), and patches `InboundReceivingPanel` with a vendor selector that fetches vendors client-side on drawer mount.

**Tech Stack:** Django 5, DRF, PostgreSQL, `F()`/`Sum()`/`Count()` aggregations, Next.js 15 Server Actions, React 19 `useActionState`, Tailwind CSS, next-intl.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `backend/apps/inventory/migrations/0009_inventory_performance_indexes.py` | Indexes for expiry/stock queries |
| Modify | `backend/apps/inventory/serializers.py` | Add `ExpiryBatchSerializer`; add `created_by_name` to `InboundTransactionSerializer` |
| Create | `backend/apps/inventory/tests/test_premium_endpoints.py` | Tests for 3 new endpoints (TDD — written before views) |
| Modify | `backend/apps/inventory/views.py` | Add `PremiumSummaryView`, `InboundDetailView`, `ExpiryReportView` |
| Modify | `backend/apps/inventory/urls.py` | Register 3 new URL paths |
| Modify | `admin/src/types/api.ts` | Add `Vendor`, `VendorMinimal`, `PremiumInventorySummary`; update `InboundTransaction` |
| Modify | `admin/src/messages/en.json` | Add 6 vendor i18n keys under `inventory.inbound` |
| Modify | `admin/src/messages/ar.json` | Same keys in Arabic |
| Modify | `admin/src/actions/inventory.ts` | Add `fetchVendorsAction`, `fetchPremiumSummaryAction`, `fetchInboundTransactionAction`, `fetchExpiryReportAction`; fix `createInboundTransactionAction` to send `vendor_id` |
| Modify | `admin/src/app/[locale]/(dashboard)/inventory/_components/InboundReceivingPanel.tsx` | Add vendor state, vendor fetch effect, vendor select UI, update submit guard |

---

## Task 1: Performance indexes migration

**Files:**
- Create: `backend/apps/inventory/migrations/0009_inventory_performance_indexes.py`

- [ ] **Step 1: Write the migration**

Create `backend/apps/inventory/migrations/0009_inventory_performance_indexes.py`:

```python
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0008_inboundtransaction_vendor"),
    ]

    operations = [
        # ProductBatch: filter by shop+expiry together (expiry report)
        migrations.AddIndex(
            model_name="productbatch",
            index=models.Index(
                fields=["shop", "expiry_date"],
                name="inv_batch_shop_expiry_idx",
            ),
        ),
        # ProductBatch: filter by product+expiry (batch lookups per product)
        migrations.AddIndex(
            model_name="productbatch",
            index=models.Index(
                fields=["product", "expiry_date"],
                name="inv_batch_prod_expiry_idx",
            ),
        ),
        # StockLevel: low-stock queries compare quantity against min_stock_level
        migrations.AddIndex(
            model_name="stocklevel",
            index=models.Index(
                fields=["shop", "quantity"],
                name="inv_sl_shop_qty_idx",
            ),
        ),
    ]
```

Note: `InboundTransactionItem.product` already has `db_index=True` on the FK — no separate migration needed.

- [ ] **Step 2: Apply the migration inside Docker**

```bash
docker compose exec app python manage.py migrate inventory
```

Expected output:
```
Applying inventory.0009_inventory_performance_indexes... OK
```

- [ ] **Step 3: Commit**

```bash
git add backend/apps/inventory/migrations/0009_inventory_performance_indexes.py
git commit -m "perf: add inventory indexes for expiry/stock report queries"
```

---

## Task 2: Serializer updates

**Files:**
- Modify: `backend/apps/inventory/serializers.py`

- [ ] **Step 1: Read the current InboundTransactionSerializer**

Open `backend/apps/inventory/serializers.py` and locate `class InboundTransactionSerializer` (near the bottom). It currently looks like:

```python
class InboundTransactionSerializer(serializers.ModelSerializer):
    items          = InboundTransactionItemSerializer(many=True, read_only=True)
    item_count     = serializers.IntegerField(source="items.count", read_only=True)
    total_quantity = serializers.SerializerMethodField()
    shop_name      = serializers.CharField(source="shop.name", read_only=True)
    vendor         = VendorMinimalSerializer(read_only=True)

    class Meta:
        model  = InboundTransaction
        fields = [
            "id", "reference", "notes",
            "shop", "shop_name",
            "vendor",
            "item_count", "total_quantity", "items",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_total_quantity(self, obj) -> str:
        total = sum(item.quantity for item in obj.items.all())
        return str(total)
```

- [ ] **Step 2: Add `created_by_name` to `InboundTransactionSerializer`**

Replace the entire `InboundTransactionSerializer` class with:

```python
class InboundTransactionSerializer(serializers.ModelSerializer):
    items           = InboundTransactionItemSerializer(many=True, read_only=True)
    item_count      = serializers.IntegerField(source="items.count", read_only=True)
    total_quantity  = serializers.SerializerMethodField()
    shop_name       = serializers.CharField(source="shop.name", read_only=True)
    vendor          = VendorMinimalSerializer(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = InboundTransaction
        fields = [
            "id", "reference", "notes",
            "shop", "shop_name",
            "vendor",
            "item_count", "total_quantity", "items",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_total_quantity(self, obj) -> str:
        total = sum(item.quantity for item in obj.items.all())
        return str(total)

    def get_created_by_name(self, obj) -> str | None:
        return obj.created_by.full_name if obj.created_by else None
```

- [ ] **Step 3: Add `ExpiryBatchSerializer`**

Append the following class at the end of `backend/apps/inventory/serializers.py` (after `InboundTransactionSerializer`):

```python
# ── Expiry report ─────────────────────────────────────────────────────────────

class ExpiryBatchSerializer(serializers.ModelSerializer):
    product_name   = serializers.CharField(source="product.name", read_only=True)
    product_sku    = serializers.CharField(source="product.sku",  read_only=True)
    shop_name      = serializers.CharField(source="shop.name",    read_only=True)
    is_expired     = serializers.BooleanField(read_only=True)
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model  = ProductBatch
        fields = [
            "id", "product", "product_name", "product_sku",
            "shop", "shop_name",
            "batch_number", "quantity",
            "expiry_date", "days_remaining",
            "is_expired",
        ]

    def get_days_remaining(self, obj) -> int:
        from datetime import date
        return (obj.expiry_date - date.today()).days
```

- [ ] **Step 4: Run existing serializer-dependent tests to confirm no regressions**

```bash
docker compose exec app python manage.py test apps.inventory.tests.test_inbound apps.inventory.tests.test_vendor --verbosity=1
```

Expected: all 45 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/inventory/serializers.py
git commit -m "feat: add ExpiryBatchSerializer and created_by_name to InboundTransactionSerializer"
```

---

## Task 3: Write failing tests for 3 new endpoints (TDD)

**Files:**
- Create: `backend/apps/inventory/tests/test_premium_endpoints.py`

- [ ] **Step 1: Create the test file**

Create `backend/apps/inventory/tests/test_premium_endpoints.py`:

```python
"""
Tests for premium-gated inventory endpoints:
  GET /api/v1/inventory/premium-summary/
  GET /api/v1/inventory/inbound/<pk>/
  GET /api/v1/inventory/reports/expiry/
"""
from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import CustomUser
from apps.inventory.models import (
    InboundTransaction,
    InboundTransactionItem,
    ProductBatch,
    StockLevel,
    Vendor,
)
from apps.products.models import Product
from apps.subscriptions.models import Plan
from apps.tenants.models import Business, BusinessType, Shop


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_plan(name="Biz", with_feature=True):
    return Plan.objects.create(
        name=name, price="0", currency="SDG", is_free=True,
        features={"inventory_inbound_receiving": True} if with_feature else {},
    )


def make_owner(phone="+249920000001"):
    return CustomUser.objects.create_user(phone=phone, full_name="Owner", role="owner")


def make_business(owner, plan, name="Test Biz"):
    b = Business.objects.create(
        name=name, owner=owner,
        business_type=BusinessType.SHOP,
        subscription_plan=plan,
    )
    owner.business = b
    owner.save(update_fields=["business", "updated_at"])
    return b


def make_shop(business, name="Main Shop"):
    return Shop.objects.create(name=name, business=business)


def make_product(tenant, name="Milk", min_stock=5):
    return Product.objects.create(
        tenant=tenant, name=name, price="1.00",
        track_inventory=True, min_stock_level=min_stock,
    )


def make_vendor(tenant, name="Al Noor"):
    return Vendor.objects.create(tenant=tenant, name=name, is_active=True)


def auth_client(user):
    c = APIClient()
    token = str(RefreshToken.for_user(user).access_token)
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return c


SUMMARY_URL      = "/api/v1/inventory/premium-summary/"
EXPIRY_URL       = "/api/v1/inventory/reports/expiry/"

def inbound_detail_url(pk):
    return f"/api/v1/inventory/inbound/{pk}/"


# ── PremiumSummaryView ────────────────────────────────────────────────────────

class PremiumSummaryViewTest(TestCase):
    def setUp(self):
        self.plan    = make_plan()
        self.owner   = make_owner()
        self.biz     = make_business(self.owner, self.plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz, min_stock=5)
        self.client  = auth_client(self.owner)

    def test_requires_feature(self):
        no_feat_plan = make_plan(name="Free", with_feature=False)
        self.biz.subscription_plan = no_feat_plan
        self.biz.save(update_fields=["subscription_plan"])
        res = self.client.get(SUMMARY_URL)
        self.assertIn(res.status_code, [400, 422])

    def test_returns_all_expected_fields(self):
        res = self.client.get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        data = res.data["data"]
        for field in [
            "stock_items_count", "low_stock_count", "out_of_stock_count",
            "expiring_soon_count", "expired_count", "active_vendors_count",
            "inbound_this_month_count", "received_quantity_this_month",
        ]:
            self.assertIn(field, data, f"Missing field: {field}")

    def test_low_stock_count(self):
        # quantity=2 <= min_stock_level=5 → low stock
        StockLevel.objects.create(product=self.product, shop=self.shop, quantity=Decimal("2"))
        res = self.client.get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["low_stock_count"], 1)

    def test_out_of_stock_count(self):
        StockLevel.objects.create(product=self.product, shop=self.shop, quantity=Decimal("0"))
        res = self.client.get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["out_of_stock_count"], 1)

    def test_expiring_soon_count(self):
        soon = date.today() + timedelta(days=10)
        ProductBatch.objects.create(
            product=self.product, shop=self.shop,
            quantity=Decimal("5"), expiry_date=soon,
        )
        res = self.client.get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["expiring_soon_count"], 1)

    def test_expired_count(self):
        past = date.today() - timedelta(days=5)
        ProductBatch.objects.create(
            product=self.product, shop=self.shop,
            quantity=Decimal("3"), expiry_date=past,
        )
        res = self.client.get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["expired_count"], 1)

    def test_active_vendors_count(self):
        make_vendor(self.biz, "Vendor A")
        make_vendor(self.biz, "Vendor B")
        Vendor.objects.create(tenant=self.biz, name="Inactive", is_active=False)
        res = self.client.get(SUMMARY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["active_vendors_count"], 2)

    def test_shop_id_filter_scopes_stock(self):
        shop2 = make_shop(self.biz, "Second Shop")
        product2 = make_product(self.biz, "Sugar", min_stock=5)
        StockLevel.objects.create(product=self.product, shop=self.shop, quantity=Decimal("2"))
        StockLevel.objects.create(product=product2, shop=shop2, quantity=Decimal("2"))
        res = self.client.get(SUMMARY_URL, {"shop_id": str(self.shop.id)})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["stock_items_count"], 1)

    def test_cashier_cannot_access(self):
        cashier = CustomUser.objects.create_user(
            phone="+249920000099", full_name="Cashier", role="cashier"
        )
        cashier.business = self.biz
        cashier.save(update_fields=["business", "updated_at"])
        res = auth_client(cashier).get(SUMMARY_URL)
        self.assertEqual(res.status_code, 403)


# ── InboundDetailView ─────────────────────────────────────────────────────────

class InboundDetailViewTest(TestCase):
    def setUp(self):
        self.plan    = make_plan()
        self.owner   = make_owner("+249920000010")
        self.biz     = make_business(self.owner, self.plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.vendor  = make_vendor(self.biz)
        self.client  = auth_client(self.owner)

        self.txn = InboundTransaction.objects.create(
            tenant=self.biz,
            shop=self.shop,
            vendor=self.vendor,
            reference="DETAIL-REF-001",
            notes="Test notes",
            created_by=self.owner,
        )
        InboundTransactionItem.objects.create(
            transaction=self.txn,
            product=self.product,
            quantity=Decimal("10"),
            unit_cost=Decimal("5.00"),
        )

    def test_returns_transaction_detail(self):
        res = self.client.get(inbound_detail_url(self.txn.id))
        self.assertEqual(res.status_code, 200)
        data = res.data["data"]
        self.assertEqual(data["reference"], "DETAIL-REF-001")
        self.assertEqual(data["notes"], "Test notes")

    def test_includes_vendor(self):
        res = self.client.get(inbound_detail_url(self.txn.id))
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(res.data["data"]["vendor"])
        self.assertEqual(res.data["data"]["vendor"]["name"], self.vendor.name)

    def test_includes_items(self):
        res = self.client.get(inbound_detail_url(self.txn.id))
        self.assertEqual(res.status_code, 200)
        items = res.data["data"]["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["quantity"], "10.000")

    def test_includes_created_by_name(self):
        res = self.client.get(inbound_detail_url(self.txn.id))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["created_by_name"], self.owner.full_name)

    def test_404_for_cross_tenant(self):
        other_plan  = make_plan(name="OtherPlan")
        other_owner = make_owner("+249920000011")
        make_business(other_owner, other_plan, name="Other Biz")
        res = auth_client(other_owner).get(inbound_detail_url(self.txn.id))
        self.assertEqual(res.status_code, 404)

    def test_requires_feature(self):
        no_feat = make_plan(name="NoFeat", with_feature=False)
        self.biz.subscription_plan = no_feat
        self.biz.save(update_fields=["subscription_plan"])
        res = self.client.get(inbound_detail_url(self.txn.id))
        self.assertIn(res.status_code, [400, 422])


# ── ExpiryReportView ──────────────────────────────────────────────────────────

class ExpiryReportViewTest(TestCase):
    def setUp(self):
        self.plan    = make_plan()
        self.owner   = make_owner("+249920000020")
        self.biz     = make_business(self.owner, self.plan)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        self.client  = auth_client(self.owner)

        self.expiring_soon = date.today() + timedelta(days=10)
        self.expired_past  = date.today() - timedelta(days=5)

    def _make_batch(self, expiry, batch_number="LOT-001", shop=None):
        return ProductBatch.objects.create(
            product=self.product,
            shop=shop or self.shop,
            quantity=Decimal("5"),
            expiry_date=expiry,
            batch_number=batch_number,
        )

    def test_returns_paginated_results(self):
        self._make_batch(self.expiring_soon)
        res = self.client.get(EXPIRY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertIn("results", res.data)
        self.assertEqual(res.data["count"], 1)

    def test_expiring_soon_filter(self):
        self._make_batch(self.expiring_soon, "LOT-SOON")
        far_future = date.today() + timedelta(days=120)
        self._make_batch(far_future, "LOT-FAR")
        res = self.client.get(EXPIRY_URL, {"status": "expiring_soon"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["batch_number"], "LOT-SOON")

    def test_expired_filter(self):
        self._make_batch(self.expired_past, "LOT-EXP")
        self._make_batch(self.expiring_soon, "LOT-SOON")
        res = self.client.get(EXPIRY_URL, {"status": "expired"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["batch_number"], "LOT-EXP")

    def test_shop_filter(self):
        shop2 = make_shop(self.biz, "Shop 2")
        self._make_batch(self.expiring_soon, "LOT-S1", shop=self.shop)
        self._make_batch(self.expiring_soon, "LOT-S2", shop=shop2)
        res = self.client.get(EXPIRY_URL, {"shop_id": str(self.shop.id)})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)

    def test_search_by_batch_number(self):
        self._make_batch(self.expiring_soon, "BATCH-XYZ")
        self._make_batch(self.expiring_soon, "BATCH-ABC")
        res = self.client.get(EXPIRY_URL, {"search": "XYZ"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)

    def test_days_remaining_positive_for_future(self):
        self._make_batch(self.expiring_soon)
        res = self.client.get(EXPIRY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertGreater(res.data["results"][0]["days_remaining"], 0)

    def test_days_remaining_negative_for_expired(self):
        self._make_batch(self.expired_past)
        res = self.client.get(EXPIRY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertLess(res.data["results"][0]["days_remaining"], 0)

    def test_requires_feature(self):
        no_feat = make_plan(name="NoFeat2", with_feature=False)
        self.biz.subscription_plan = no_feat
        self.biz.save(update_fields=["subscription_plan"])
        res = self.client.get(EXPIRY_URL)
        self.assertIn(res.status_code, [400, 422])

    def test_tenant_isolation(self):
        other_plan  = make_plan(name="OtherPlan2")
        other_owner = make_owner("+249920000021")
        other_biz   = make_business(other_owner, other_plan, name="Other")
        other_shop  = make_shop(other_biz)
        other_prod  = make_product(other_biz, "Other Milk")
        ProductBatch.objects.create(
            product=other_prod, shop=other_shop,
            quantity=Decimal("5"), expiry_date=self.expiring_soon,
        )
        res = self.client.get(EXPIRY_URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 0)
```

- [ ] **Step 2: Run to confirm all tests fail**

```bash
docker compose exec app python manage.py test apps.inventory.tests.test_premium_endpoints --verbosity=1 2>&1 | tail -10
```

Expected: all tests FAIL with `404 != 200` or similar — confirming the views don't exist yet.

- [ ] **Step 3: Commit the failing tests**

```bash
git add backend/apps/inventory/tests/test_premium_endpoints.py
git commit -m "test: add failing tests for premium-summary, inbound-detail, expiry-report (TDD)"
```

---

## Task 4: `PremiumSummaryView`

**Files:**
- Modify: `backend/apps/inventory/views.py` (append)

- [ ] **Step 1: Add missing imports to `views.py`**

At the top of `backend/apps/inventory/views.py`, the current imports line is:
```python
from django.db.models import Count, Q, Sum
```

Replace it with:
```python
from datetime import date, timedelta
from decimal import Decimal as D

from django.db.models import Count, F, Q, Sum
from django.utils import timezone
```

- [ ] **Step 2: Add `ExpiryBatchSerializer` to the serializer imports**

In the `from .serializers import (...)` block in `views.py`, add `ExpiryBatchSerializer` to the list:

```python
from .serializers import (
    ExpiryAlertSerializer,
    ExpiryBatchSerializer,
    InboundReceiveSerializer,
    InboundTransactionSerializer,
    ProductBatchSerializer,
    ProductBatchWriteSerializer,
    StockAdjustmentSerializer,
    StockLevelSerializer,
    StockMovementCreateSerializer,
    StockMovementSerializer,
    StockTransferSerializer,
    VendorCreateUpdateSerializer,
    VendorSerializer,
)
```

- [ ] **Step 3: Append `PremiumSummaryView` to `views.py`**

Append at the very end of `backend/apps/inventory/views.py`:

```python
# ── Premium summary ───────────────────────────────────────────────────────────

class PremiumSummaryView(APIView):
    """
    GET /api/v1/inventory/premium-summary/

    Feature-gated KPI summary for the premium inventory dashboard.
    Query param: shop_id (optional) — scopes stock/batch/inbound counts to one shop.
    """
    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = tenant.subscription_plan
        if plan is None or not plan.has_feature("inventory_inbound_receiving"):
            raise SubscriptionLimitError(
                "Your plan does not include Premium Inventory.",
                code="FEATURE_NOT_INCLUDED",
            )

        shop_id    = request.query_params.get("shop_id")
        today      = date.today()
        expiry_soon = today + timedelta(days=30)
        now        = timezone.now()

        sl_qs     = StockLevel.objects.filter(shop__business=tenant)
        batch_qs  = ProductBatch.objects.filter(shop__business=tenant)
        inbound_qs = InboundTransaction.objects.filter(tenant=tenant)

        if shop_id:
            sl_qs      = sl_qs.filter(shop_id=shop_id)
            batch_qs   = batch_qs.filter(shop_id=shop_id)
            inbound_qs = inbound_qs.filter(shop_id=shop_id)

        stock_items_count  = sl_qs.count()
        low_stock_count    = sl_qs.filter(
            quantity__gt=0,
            quantity__lte=F("product__min_stock_level"),
        ).count()
        out_of_stock_count = sl_qs.filter(quantity__lte=0).count()

        expiring_soon_count = batch_qs.filter(
            expiry_date__gte=today,
            expiry_date__lte=expiry_soon,
        ).count()
        expired_count = batch_qs.filter(expiry_date__lt=today).count()

        active_vendors_count = Vendor.objects.filter(
            tenant=tenant, is_active=True,
        ).count()

        inbound_month_qs = inbound_qs.filter(
            created_at__year=now.year,
            created_at__month=now.month,
        )
        inbound_this_month_count = inbound_month_qs.count()
        received_qty = (
            InboundTransactionItem.objects
            .filter(transaction__in=inbound_month_qs)
            .aggregate(total=Sum("quantity"))["total"] or D("0")
        )

        return Response({
            "success": True,
            "data": {
                "stock_items_count":            stock_items_count,
                "low_stock_count":              low_stock_count,
                "out_of_stock_count":           out_of_stock_count,
                "expiring_soon_count":          expiring_soon_count,
                "expired_count":                expired_count,
                "active_vendors_count":         active_vendors_count,
                "inbound_this_month_count":     inbound_this_month_count,
                "received_quantity_this_month": str(received_qty),
            },
        })
```

- [ ] **Step 4: Register the URL**

Open `backend/apps/inventory/urls.py` and add to the inbound section:

```python
    # ── Premium reports & summary ─────────────────────────────────────────────
    path("premium-summary/",        views.PremiumSummaryView.as_view(),  name="premium_summary"),
```

Add it before the `# ── Inbound receiving` comment so the full inbound section remains grouped.

- [ ] **Step 5: Run the premium summary tests**

```bash
docker compose exec app python manage.py test apps.inventory.tests.test_premium_endpoints.PremiumSummaryViewTest --verbosity=2
```

Expected: all 8 PremiumSummaryViewTest tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/inventory/views.py backend/apps/inventory/urls.py
git commit -m "feat: add GET /api/v1/inventory/premium-summary/ endpoint"
```

---

## Task 5: `InboundDetailView`

**Files:**
- Modify: `backend/apps/inventory/views.py` (append)
- Modify: `backend/apps/inventory/urls.py`

- [ ] **Step 1: Append `InboundDetailView` to `views.py`**

Append at the end of `backend/apps/inventory/views.py`:

```python
# ── Inbound transaction detail ────────────────────────────────────────────────

class InboundDetailView(APIView):
    """
    GET /api/v1/inventory/inbound/<uuid:pk>/

    Feature-gated. Returns full inbound transaction with items, vendor,
    shop, and created_by_name.
    """
    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    def get(self, request, pk):
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = tenant.subscription_plan
        if plan is None or not plan.has_feature("inventory_inbound_receiving"):
            raise SubscriptionLimitError(
                "Your plan does not include Premium Inventory.",
                code="FEATURE_NOT_INCLUDED",
            )

        try:
            txn = (
                InboundTransaction.objects
                .select_related("vendor", "shop", "created_by")
                .prefetch_related("items__product")
                .get(pk=pk, tenant=tenant)
            )
        except InboundTransaction.DoesNotExist:
            raise NotFound("Inbound transaction not found.")

        return Response({
            "success": True,
            "data": InboundTransactionSerializer(txn).data,
        })
```

- [ ] **Step 2: Add URL for inbound detail**

In `backend/apps/inventory/urls.py`, add to the inbound receiving section:

```python
    path("inbound/<uuid:pk>/",      views.InboundDetailView.as_view(),   name="inbound_detail"),
```

The full inbound section should now look like:

```python
    # ── Inbound receiving ─────────────────────────────────────────────────────
    path("inbound/vendor-summary/", views.InboundVendorSummaryView.as_view(), name="inbound_vendor_summary"),
    path("inbound/<uuid:pk>/",      views.InboundDetailView.as_view(),        name="inbound_detail"),
    path("inbound/",               views.InboundReceiveView.as_view(),        name="inbound_receive"),
```

Note: `<uuid:pk>` only matches valid UUIDs, so "vendor-summary" won't conflict. Order is still safest specific-first.

- [ ] **Step 3: Run inbound detail tests**

```bash
docker compose exec app python manage.py test apps.inventory.tests.test_premium_endpoints.InboundDetailViewTest --verbosity=2
```

Expected: all 6 InboundDetailViewTest tests PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/apps/inventory/views.py backend/apps/inventory/urls.py
git commit -m "feat: add GET /api/v1/inventory/inbound/<id>/ endpoint"
```

---

## Task 6: `ExpiryReportView` + full test run

**Files:**
- Modify: `backend/apps/inventory/views.py` (append)
- Modify: `backend/apps/inventory/urls.py`

- [ ] **Step 1: Append `ExpiryReportView` to `views.py`**

Append at the end of `backend/apps/inventory/views.py`:

```python
# ── Expiry report ─────────────────────────────────────────────────────────────

class ExpiryReportView(APIView):
    """
    GET /api/v1/inventory/reports/expiry/

    Feature-gated paginated expiry report.

    Query params:
      status      — expiring_soon | expired | all (default)
      shop_id     — filter by shop
      vendor_id   — filter by vendor (approximate: products supplied by vendor)
      date_from   — expiry_date >=
      date_to     — expiry_date <=
      search      — product name or batch number
    """
    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = tenant.subscription_plan
        if plan is None or not plan.has_feature("inventory_inbound_receiving"):
            raise SubscriptionLimitError(
                "Your plan does not include Premium Inventory.",
                code="FEATURE_NOT_INCLUDED",
            )

        qs = (
            ProductBatch.objects
            .filter(shop__business=tenant)
            .select_related("product", "shop")
            .order_by("expiry_date")
        )

        params = request.query_params
        today  = date.today()

        status_filter = params.get("status", "all")
        if status_filter == "expiring_soon":
            qs = qs.filter(expiry_date__gte=today, expiry_date__lte=today + timedelta(days=30))
        elif status_filter == "expired":
            qs = qs.filter(expiry_date__lt=today)

        if shop_id := params.get("shop_id"):
            qs = qs.filter(shop_id=shop_id)

        if date_from := params.get("date_from"):
            qs = qs.filter(expiry_date__gte=date_from)

        if date_to := params.get("date_to"):
            qs = qs.filter(expiry_date__lte=date_to)

        if vendor_id := params.get("vendor_id"):
            # Approximate: return batches for products supplied by this vendor
            supplied = (
                InboundTransactionItem.objects
                .filter(transaction__vendor_id=vendor_id, transaction__tenant=tenant)
                .values_list("product_id", flat=True)
                .distinct()
            )
            qs = qs.filter(product__in=supplied)

        if search := params.get("search"):
            qs = qs.filter(
                Q(product__name__icontains=search) | Q(batch_number__icontains=search)
            )

        paginator  = StandardPagination()
        page       = paginator.paginate_queryset(qs, request)
        serializer = ExpiryBatchSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
```

- [ ] **Step 2: Add URL for expiry report**

In `backend/apps/inventory/urls.py`, add a new reports section after the vendors section:

```python
    # ── Reports (premium-gated) ───────────────────────────────────────────────
    path("reports/expiry/",         views.ExpiryReportView.as_view(),     name="expiry_report"),
```

The complete final `urls.py` should be:

```python
from django.urls import path
from . import views

app_name = "inventory"

urlpatterns = [
    # ── Stock ─────────────────────────────────────────────────────────────────
    path("stock/",             views.StockLevelListView.as_view(),  name="stock_list"),
    path("stock/add/",         views.StockAddView.as_view(),        name="stock_add"),
    path("stock/adjust/",      views.StockAdjustView.as_view(),     name="stock_adjust"),
    path("stock/transfer/",    views.StockTransferView.as_view(),   name="stock_transfer"),

    # ── Movements ─────────────────────────────────────────────────────────────
    path("movements/",         views.StockMovementListView.as_view(), name="movement_list"),

    # ── Batches & expiry ──────────────────────────────────────────────────────
    path("batches/",           views.BatchListView.as_view(),        name="batch_list"),
    path("batches/<uuid:pk>/", views.BatchDetailView.as_view(),      name="batch_detail"),
    path("expiry-alerts/",     views.ExpiryAlertsView.as_view(),     name="expiry_alerts"),

    # ── Premium summary ───────────────────────────────────────────────────────
    path("premium-summary/",        views.PremiumSummaryView.as_view(),       name="premium_summary"),

    # ── Inbound receiving ─────────────────────────────────────────────────────
    path("inbound/vendor-summary/", views.InboundVendorSummaryView.as_view(), name="inbound_vendor_summary"),
    path("inbound/<uuid:pk>/",      views.InboundDetailView.as_view(),        name="inbound_detail"),
    path("inbound/",               views.InboundReceiveView.as_view(),        name="inbound_receive"),

    # ── Vendors ───────────────────────────────────────────────────────────────
    path("vendors/",           views.VendorListCreateView.as_view(), name="vendor_list"),
    path("vendors/<uuid:pk>/", views.VendorDetailView.as_view(),     name="vendor_detail"),

    # ── Reports (premium-gated) ───────────────────────────────────────────────
    path("reports/expiry/",         views.ExpiryReportView.as_view(),         name="expiry_report"),
]
```

- [ ] **Step 3: Run all premium endpoint tests**

```bash
docker compose exec app python manage.py test apps.inventory.tests.test_premium_endpoints --verbosity=2
```

Expected: all 23 tests PASS.

- [ ] **Step 4: Run the full inventory test suite**

```bash
docker compose exec app python manage.py test apps.inventory --verbosity=1
```

Expected: all tests PASS (45 existing + 23 new = 68 total).

- [ ] **Step 5: Commit**

```bash
git add backend/apps/inventory/views.py backend/apps/inventory/urls.py
git commit -m "feat: add GET /api/v1/inventory/reports/expiry/ endpoint"
```

---

## Task 7: Frontend types and i18n

**Files:**
- Modify: `admin/src/types/api.ts`
- Modify: `admin/src/messages/en.json`
- Modify: `admin/src/messages/ar.json`

- [ ] **Step 1: Add `VendorMinimal` and `Vendor` types to `api.ts`**

In `admin/src/types/api.ts`, locate the `Shop` interface (around line 180). Add the following two interfaces immediately after it:

```typescript
export interface VendorMinimal {
  id: string;
  name: string;
  phone: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Update `InboundTransaction` in `api.ts`**

Locate the existing `InboundTransaction` interface (around line 120). Replace it with:

```typescript
export interface InboundTransaction {
  id: string;
  reference: string;
  notes: string;
  shop: string;
  shop_name: string;
  vendor: VendorMinimal | null;
  total_quantity: string;
  item_count: number;
  items: InboundTransactionItem[];
  created_by_name: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Add `PremiumInventorySummary` type to `api.ts`**

After the `InboundTransaction` interface, add:

```typescript
export interface PremiumInventorySummary {
  stock_items_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
  active_vendors_count: number;
  inbound_this_month_count: number;
  received_quantity_this_month: string;
}

export interface ExpiryBatch {
  id: string;
  product: string;
  product_name: string;
  product_sku: string;
  shop: string;
  shop_name: string;
  batch_number: string;
  quantity: string;
  expiry_date: string;
  days_remaining: number;
  is_expired: boolean;
}
```

- [ ] **Step 4: Add vendor i18n keys to `en.json`**

In `admin/src/messages/en.json`, locate the `inventory.inbound` object. Add 6 new keys after `"noProducts"`:

```json
"vendor": "Vendor",
"vendorPlaceholder": "Select vendor…",
"vendorLoading": "Loading vendors…",
"noVendors": "No active vendors. Add a vendor first.",
"vendorInactive": "This vendor is inactive. Please select an active vendor.",
"vendorNotFound": "Vendor not found. Please refresh and try again."
```

The end of the `inbound` object should look like:

```json
      "loadingProducts": "Loading products…",
      "noProducts": "No active products found for this shop.",
      "vendor": "Vendor",
      "vendorPlaceholder": "Select vendor…",
      "vendorLoading": "Loading vendors…",
      "noVendors": "No active vendors. Add a vendor first.",
      "vendorInactive": "This vendor is inactive. Please select an active vendor.",
      "vendorNotFound": "Vendor not found. Please refresh and try again."
    }
```

- [ ] **Step 5: Add vendor i18n keys to `ar.json`**

In `admin/src/messages/ar.json`, locate the `inventory.inbound` object and add after `"noProducts"`:

```json
"vendor": "المورد",
"vendorPlaceholder": "اختر مورداً…",
"vendorLoading": "جاري تحميل الموردين…",
"noVendors": "لا يوجد موردون نشطون. أضف مورداً أولاً.",
"vendorInactive": "هذا المورد غير نشط. يرجى اختيار مورد نشط.",
"vendorNotFound": "المورد غير موجود. يرجى تحديث الصفحة والمحاولة مجدداً."
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add admin/src/types/api.ts admin/src/messages/en.json admin/src/messages/ar.json
git commit -m "feat: add Vendor, PremiumInventorySummary, ExpiryBatch types and vendor i18n keys"
```

---

## Task 8: New frontend server actions

**Files:**
- Modify: `admin/src/actions/inventory.ts`

- [ ] **Step 1: Read the current top of `actions/inventory.ts`**

Open `admin/src/actions/inventory.ts`. Confirm the file starts with:
```typescript
'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { extractApiError } from '@/lib/action-error';
import type { ApiList, StockLevel, StockMovement, Product } from '@/types/api';
```

- [ ] **Step 2: Update the type import line**

Replace the `import type` line with:

```typescript
import type { ApiList, ApiResponse, ExpiryBatch, InboundTransaction, PremiumInventorySummary, Product, StockLevel, StockMovement, Vendor } from '@/types/api';
```

Also add `devFetch` import if not already present — check the existing file for it. If it has `import { devFetch } from '@/lib/dev-logger';`, leave it. If not, add it:

```typescript
import { devFetch } from '@/lib/dev-logger';
```

- [ ] **Step 3: Append `fetchVendorsAction`**

Append to the end of `admin/src/actions/inventory.ts`:

```typescript
// ── Vendor list ───────────────────────────────────────────────────────────────

export type VendorsResult =
  | { ok: true; data: Vendor[] }
  | { ok: false; error: string };

export async function fetchVendorsAction(): Promise<VendorsResult> {
  try {
    const res = await fetch(
      `${API()}/api/v1/inventory/vendors/?is_active=true&page_size=200`,
      {
        headers: { Authorization: `Bearer ${await authToken()}` },
        cache: 'no-store',
      },
    );
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: (json as ApiList<Vendor>).results ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
```

- [ ] **Step 4: Append `fetchPremiumSummaryAction`**

```typescript
// ── Premium summary ───────────────────────────────────────────────────────────

export type PremiumSummaryResult =
  | { ok: true; data: PremiumInventorySummary }
  | { ok: false; error: string };

export async function fetchPremiumSummaryAction(shopId?: string): Promise<PremiumSummaryResult> {
  try {
    const url = new URL(`${API()}/api/v1/inventory/premium-summary/`);
    if (shopId) url.searchParams.set('shop_id', shopId);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: (json as ApiResponse<PremiumInventorySummary>).data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
```

- [ ] **Step 5: Append `fetchInboundTransactionAction`**

```typescript
// ── Inbound transaction detail ────────────────────────────────────────────────

export type InboundDetailResult =
  | { ok: true; data: InboundTransaction }
  | { ok: false; error: string };

export async function fetchInboundTransactionAction(id: string): Promise<InboundDetailResult> {
  try {
    const res = await fetch(`${API()}/api/v1/inventory/inbound/${id}/`, {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: (json as ApiResponse<InboundTransaction>).data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
```

- [ ] **Step 6: Append `fetchExpiryReportAction`**

```typescript
// ── Expiry report ─────────────────────────────────────────────────────────────

export interface ExpiryReportParams {
  status?:    'expiring_soon' | 'expired' | 'all';
  shop_id?:   string;
  vendor_id?: string;
  date_from?: string;
  date_to?:   string;
  search?:    string;
  page?:      number;
}

export type ExpiryReportResult =
  | { ok: true; data: ExpiryBatch[]; count: number; total_pages: number }
  | { ok: false; error: string };

export async function fetchExpiryReportAction(params: ExpiryReportParams = {}): Promise<ExpiryReportResult> {
  try {
    const url = new URL(`${API()}/api/v1/inventory/reports/expiry/`);
    if (params.status)    url.searchParams.set('status',    params.status);
    if (params.shop_id)   url.searchParams.set('shop_id',   params.shop_id);
    if (params.vendor_id) url.searchParams.set('vendor_id', params.vendor_id);
    if (params.date_from) url.searchParams.set('date_from', params.date_from);
    if (params.date_to)   url.searchParams.set('date_to',   params.date_to);
    if (params.search)    url.searchParams.set('search',    params.search);
    if (params.page)      url.searchParams.set('page',      String(params.page));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    const list = json as ApiList<ExpiryBatch>;
    return { ok: true, data: list.results ?? [], count: list.count ?? 0, total_pages: list.total_pages ?? 1 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
```

- [ ] **Step 7: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add admin/src/actions/inventory.ts
git commit -m "feat: add fetchVendorsAction, fetchPremiumSummaryAction, fetchInboundTransactionAction, fetchExpiryReportAction"
```

---

## Task 9: Fix InboundReceivingPanel — vendor selector

This is the primary fix: the inbound form currently fails every submission because `vendor_id` is not sent. This task adds the vendor selector to the form and wires `vendor_id` into the action.

**Files:**
- Modify: `admin/src/actions/inventory.ts` (patch `createInboundTransactionAction`)
- Modify: `admin/src/app/[locale]/(dashboard)/inventory/_components/InboundReceivingPanel.tsx`

### 9a: Patch `createInboundTransactionAction`

- [ ] **Step 1: Add vendor_id to the action**

In `admin/src/actions/inventory.ts`, locate `createInboundTransactionAction`. The function currently starts with:

```typescript
export async function createInboundTransactionAction(
  _prev: InboundState,
  formData: FormData,
): Promise<InboundState> {
  const shop      = (formData.get('shop')      as string)?.trim();
  const reference = (formData.get('reference') as string)?.trim();
  const notes     = (formData.get('notes')     as string)?.trim();
  const itemsJson = (formData.get('items')     as string)?.trim();

  if (!shop)      return { error: 'Shop is required.' };
  if (!reference) return { error: 'Reference / invoice number is required.' };
```

Replace those lines with:

```typescript
export async function createInboundTransactionAction(
  _prev: InboundState,
  formData: FormData,
): Promise<InboundState> {
  const shop      = (formData.get('shop')      as string)?.trim();
  const vendor_id = (formData.get('vendor_id') as string)?.trim();
  const reference = (formData.get('reference') as string)?.trim();
  const notes     = (formData.get('notes')     as string)?.trim();
  const itemsJson = (formData.get('items')     as string)?.trim();

  if (!shop)      return { error: 'Shop is required.' };
  if (!vendor_id) return { error: 'Vendor is required.' };
  if (!reference) return { error: 'Reference / invoice number is required.' };
```

- [ ] **Step 2: Add `vendor_id` to the request body**

Locate the `const body: Record<string, unknown> = {` block inside the function. It currently starts with:

```typescript
  const body: Record<string, unknown> = {
    shop_id:   shop,
    reference,
```

Replace with:

```typescript
  const body: Record<string, unknown> = {
    shop_id:   shop,
    vendor_id,
    reference,
```

### 9b: Add vendor selector to `InboundReceivingPanel`

- [ ] **Step 3: Update imports in `InboundReceivingPanel.tsx`**

Open `admin/src/app/[locale]/(dashboard)/inventory/_components/InboundReceivingPanel.tsx`.

The current import line for types is:
```typescript
import type { Shop, Product } from '@/types/api';
```

Replace with:
```typescript
import type { Shop, Product, Vendor } from '@/types/api';
```

The current import line for actions is:
```typescript
import {
  createInboundTransactionAction,
  fetchProductsForShopAction,
  type InboundState,
} from '@/actions/inventory';
```

Replace with:
```typescript
import {
  createInboundTransactionAction,
  fetchProductsForShopAction,
  fetchVendorsAction,
  type InboundState,
} from '@/actions/inventory';
```

- [ ] **Step 4: Add vendor state to `DrawerContent`**

In `DrawerContent`, the current state declarations are:

```typescript
  const defaultShop = shops[0]?.id ?? '';
  const [shopId, setShopId]     = useState(defaultShop);
  const [rows,   setRows]       = useState<ItemRow[]>([newRow()]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
```

Replace with:

```typescript
  const defaultShop = shops[0]?.id ?? '';
  const [shopId,   setShopId]   = useState(defaultShop);
  const [vendorId, setVendorId] = useState('');
  const [rows,     setRows]     = useState<ItemRow[]>([newRow()]);
  const [products,       setProducts]       = useState<Product[]>([]);
  const [vendors,        setVendors]        = useState<Vendor[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingVendors,  setLoadingVendors]  = useState(false);
```

- [ ] **Step 5: Add vendor fetch effect to `DrawerContent`**

After the existing `shopId` useEffect (which ends at `}, [shopId]);`), add the following new effect:

```typescript
  // Fetch active vendors once when drawer mounts
  useEffect(() => {
    let ignored = false;
    setLoadingVendors(true);
    fetchVendorsAction().then((res) => {
      if (ignored) return;
      const list = res.ok ? res.data : [];
      setVendors(list);
      if (list.length > 0) setVendorId(list[0].id);
      setLoadingVendors(false);
    });
    return () => { ignored = true; };
  }, []);
```

- [ ] **Step 6: Add vendor select to the form JSX**

In the form's JSX, locate the section that renders the shop selector and reference input. Currently it looks like:

```tsx
          <input type="hidden" name="items" />

          {shops.length > 1 ? (
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">
                {t('inbound.shop')}
              </label>
              ...
            </div>
          ) : (
            <input type="hidden" name="shop" value={defaultShop} />
          )}

          <Input
            label={t('inbound.reference')}
            ...
          />
```

After the hidden `items` input and the shop selector section, **before** the `<Input label={t('inbound.reference')} .../>`, add the vendor selector:

```tsx
          {/* Vendor selector — required, fetched on mount */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">
              {t('inbound.vendor')}
            </label>
            {loadingVendors ? (
              <p className="text-xs text-muted-foreground py-2">{t('inbound.vendorLoading')}</p>
            ) : vendors.length === 0 ? (
              <p className="text-xs text-amber-600 italic py-2">{t('inbound.noVendors')}</p>
            ) : (
              <select
                name="vendor_id"
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            )}
          </div>
```

- [ ] **Step 7: Update the submit button disabled condition**

Locate the submit button in the form footer (near the bottom of `DrawerContent`):

```tsx
        <Button size="sm" type="submit" disabled={isPending || products.length === 0}>
```

Replace with:

```tsx
        <Button size="sm" type="submit" disabled={isPending || products.length === 0 || vendors.length === 0 || loadingVendors}>
```

- [ ] **Step 8: TypeScript check**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS/admin && npx tsc --noEmit 2>&1 | grep -v "BusinessesTable\|OwnersTable"
```

Expected: no new errors.

- [ ] **Step 9: Manual smoke test — submit an inbound transaction**

Start the Next.js dev server and the backend:

```bash
# Terminal 1
docker compose up app

# Terminal 2
cd admin && npm run dev
```

Open `http://localhost:3001/en/inventory` as an owner with the feature enabled.

1. Click "Receive Stock" — the drawer should open.
2. Verify "Vendor" dropdown appears above "Reference / Invoice #".
3. Verify vendors load automatically (no manual action needed).
4. Fill in reference, select a product, enter quantity.
5. Click "Record Inbound".
6. Expected: success (no error), inventory page refreshes, stock level updates.
7. Click "Receive Stock" again and try to submit the same reference → expected error "already exists".

- [ ] **Step 10: Commit**

```bash
cd /Users/almogdadjabir/Documents/projects/AmanaPOS
git add \
  admin/src/actions/inventory.ts \
  "admin/src/app/[locale]/(dashboard)/inventory/_components/InboundReceivingPanel.tsx"
git commit -m "fix: inbound form — add vendor selector and send vendor_id in POST"
```

---

## Self-Review

### 1. Spec coverage

| Requirement | Task |
|---|---|
| Fix inbound form — add vendor selector | Task 9 |
| Send `vendor_id` in POST body | Task 9 — action patch |
| Validate vendor_id before submit | Task 9 — action returns `{ error }` if missing |
| Backend errors surfaced as inline errors | Task 9 — `extractApiError` returns backend message; `FormError` renders it |
| `GET /api/v1/inventory/premium-summary/` | Task 4 |
| `GET /api/v1/inventory/inbound/<id>/` | Task 5 |
| `GET /api/v1/inventory/reports/expiry/` | Task 6 |
| Feature-gated — all 3 new endpoints | Tasks 4, 5, 6 — all use `plan.has_feature()` guard |
| Performance indexes | Task 1 |
| `Vendor` + `PremiumInventorySummary` frontend types | Task 7 |
| `fetchVendorsAction` | Task 8 |
| Prep actions for sub-project 2 | Task 8 |
| i18n vendor keys | Task 7 |

### 2. Placeholder scan

No TBD, TODO, or incomplete sections.

### 3. Type consistency

- `fetchVendorsAction` returns `Vendor[]` — matches `Vendor` type added in Task 7. ✅
- `fetchPremiumSummaryAction` returns `PremiumInventorySummary` — matches type in Task 7. ✅
- `ExpiryBatchSerializer.get_days_remaining` returns int (can be negative for expired). Matches `ExpiryBatch.days_remaining: number` in Task 7. ✅
- `InboundTransactionSerializer.get_created_by_name` returns `str | None`. Matches `created_by_name: string | null` in Task 7. ✅
- `formData.get('vendor_id')` read in action matches `name="vendor_id"` on the select element in Task 9. ✅
- `body.vendor_id` sent to `POST /api/v1/inventory/inbound/` — backend `InboundReceiveSerializer` expects `vendor_id: UUIDField()`. ✅
