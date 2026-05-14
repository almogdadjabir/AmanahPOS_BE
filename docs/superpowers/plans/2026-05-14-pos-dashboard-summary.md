# POS Dashboard Summary API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /api/v1/sales/dashboard-summary/` returning real-time POS sales totals, shift summary, hourly sparkline, and top sellers with 60s cache and UTC-range-indexed queries.

**Architecture:** New `DashboardSummaryView` in `apps/sales/views.py`. Two new fields (`currency`, `timezone`) on `Business`. Three new covering indexes on `Sale`. 5 targeted DB queries, 60s Redis cache keyed per scope. No new models.

**Tech Stack:** Django 5, DRF, Python `zoneinfo` (stdlib, Python 3.9+), `django.core.cache` (Redis), `django.db.models.functions.TruncHour`.

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `apps/tenants/models/business.py` | Add `currency`, `timezone` fields |
| Create | `apps/tenants/migrations/0006_business_currency_timezone.py` | Migration for new fields |
| Modify | `apps/offline/serializers.py` | Add `currency`, `timezone` to `BootstrapBusinessSerializer` |
| Modify | `apps/sales/models/sale.py` | Add 3 covering indexes to `Meta.indexes` |
| Create | `apps/sales/migrations/0007_sale_dashboard_indexes.py` | Migration for new indexes |
| Create | `apps/sales/tests/__init__.py` | Empty package marker |
| Create | `apps/sales/tests/test_dashboard_summary.py` | 14 test cases |
| Modify | `apps/sales/views.py` | Add `DashboardSummaryView` class |
| Modify | `apps/sales/urls.py` | Register `dashboard-summary/` route |

---

## Task 1: Business model — add `currency` + `timezone`

**Files:**
- Modify: `backend/apps/tenants/models/business.py`
- Create: `backend/apps/tenants/migrations/0006_business_currency_timezone.py`
- Modify: `backend/apps/offline/serializers.py`

- [ ] **Step 1: Add fields to Business model**

In `backend/apps/tenants/models/business.py`, add two lines after `is_active` (line 39):

```python
    is_active = models.BooleanField(default=True, db_index=True)
    currency = models.CharField(max_length=10, default="SDG")
    timezone = models.CharField(max_length=60, default="Africa/Khartoum")
    created_at = models.DateTimeField(auto_now_add=True)
```

- [ ] **Step 2: Create migration**

Create `backend/apps/tenants/migrations/0006_business_currency_timezone.py`:

```python
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0005_business_business_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="business",
            name="currency",
            field=models.CharField(default="SDG", max_length=10),
        ),
        migrations.AddField(
            model_name="business",
            name="timezone",
            field=models.CharField(default="Africa/Khartoum", max_length=60),
        ),
    ]
```

- [ ] **Step 3: Run migration and verify**

```bash
docker exec amanapos_app python manage.py migrate tenants
```

Expected: `Applying tenants.0006_business_currency_timezone... OK`

- [ ] **Step 4: Add fields to BootstrapBusinessSerializer**

In `backend/apps/offline/serializers.py`, update line 20:

```python
class BootstrapBusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = [
            "id", "name", "slug", "business_type",
            "address", "phone", "email",
            "currency", "timezone",
            "is_active", "updated_at",
        ]
```

- [ ] **Step 5: Commit**

```bash
git add backend/apps/tenants/models/business.py \
        backend/apps/tenants/migrations/0006_business_currency_timezone.py \
        backend/apps/offline/serializers.py
git commit -m "feat: add currency and timezone fields to Business model"
```

---

## Task 2: Sale model — add covering indexes

**Files:**
- Modify: `backend/apps/sales/models/sale.py`
- Create: `backend/apps/sales/migrations/0007_sale_dashboard_indexes.py`

- [ ] **Step 1: Add 3 indexes to Sale.Meta.indexes**

In `backend/apps/sales/models/sale.py`, replace the existing `indexes` list (lines 57–63):

```python
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["shop", "created_at"]),
            models.Index(fields=["cashier", "created_at"]),
            models.Index(fields=["receipt_number"]),
            # Covering indexes for DashboardSummaryView
            models.Index(
                fields=["tenant", "status", "created_at"],
                name="sale_tenant_status_created_idx",
            ),
            models.Index(
                fields=["tenant", "shop", "status", "created_at"],
                name="sale_tenant_shop_status_created_idx",
            ),
            models.Index(
                fields=["tenant", "cashier", "status", "created_at"],
                name="sale_cashier_status_created_idx",
            ),
        ]
```

- [ ] **Step 2: Create migration**

Create `backend/apps/sales/migrations/0007_sale_dashboard_indexes.py`:

```python
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0006_sale_client_sale_id"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="sale",
            index=models.Index(
                fields=["tenant", "status", "created_at"],
                name="sale_tenant_status_created_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="sale",
            index=models.Index(
                fields=["tenant", "shop", "status", "created_at"],
                name="sale_tenant_shop_status_created_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="sale",
            index=models.Index(
                fields=["tenant", "cashier", "status", "created_at"],
                name="sale_cashier_status_created_idx",
            ),
        ),
    ]
```

- [ ] **Step 3: Run migration and verify**

```bash
docker exec amanapos_app python manage.py migrate sales
```

Expected: `Applying sales.0007_sale_dashboard_indexes... OK`

- [ ] **Step 4: Commit**

```bash
git add backend/apps/sales/models/sale.py \
        backend/apps/sales/migrations/0007_sale_dashboard_indexes.py
git commit -m "perf: add covering indexes on Sale for dashboard summary queries"
```

---

## Task 3: Write failing tests

**Files:**
- Create: `backend/apps/sales/tests/__init__.py`
- Create: `backend/apps/sales/tests/test_dashboard_summary.py`

- [ ] **Step 1: Create the tests package**

Create `backend/apps/sales/tests/__init__.py` as an empty file.

- [ ] **Step 2: Write test file**

Create `backend/apps/sales/tests/test_dashboard_summary.py`:

```python
"""Tests for GET /api/v1/sales/dashboard-summary/"""
import zoneinfo
from datetime import datetime, timedelta, time as dt_time
from decimal import Decimal

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.products.models import Product
from apps.sales.models import PaymentMethod, Sale, SaleItem, SaleStatus
from apps.tenants.models import Business, Shop

ENDPOINT = "/api/v1/sales/dashboard-summary/"

CACHE_SETTINGS = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-dashboard-cache",
    }
}


def _today_utc_range(tz_name="Africa/Khartoum"):
    """Return (start_utc, end_utc) for today in the given IANA timezone."""
    tz = zoneinfo.ZoneInfo(tz_name)
    today = datetime.now(tz).date()
    local_start = datetime.combine(today, dt_time.min).replace(tzinfo=tz)
    start_utc = local_start.astimezone(zoneinfo.ZoneInfo("UTC"))
    return start_utc, start_utc + timedelta(days=1)


@override_settings(CACHES=CACHE_SETTINGS)
class DashboardSummaryTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self._receipt_counter = 0

        # Owner user (business is set after business creation)
        self.owner = CustomUser.objects.create(
            phone="+249900000001",
            full_name="Owner User",
            role="owner",
            is_active=True,
        )

        # Business with explicit currency + timezone
        self.business = Business.objects.create(
            name="Test Business",
            owner=self.owner,
            currency="SDG",
            timezone="Africa/Khartoum",
        )
        self.owner.business = self.business
        self.owner.save(update_fields=["business"])

        # Two shops
        self.shop = Shop.objects.create(
            business=self.business,
            name="Main Shop",
            is_main=True,
            is_active=True,
        )
        self.shop2 = Shop.objects.create(
            business=self.business,
            name="Branch Shop",
            is_main=False,
            is_active=True,
        )

        # Cashier with default_shop = self.shop
        self.cashier = CustomUser.objects.create(
            phone="+249900000002",
            full_name="Cashier User",
            role="cashier",
            business=self.business,
            default_shop=self.shop,
            is_active=True,
        )

        # One product for top_sellers tests
        self.product = Product.objects.create(
            tenant=self.business,
            name="Test Product",
            price=Decimal("500.00"),
        )

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _make_sale(
        self,
        shop=None,
        cashier=None,
        amount=Decimal("1000.00"),
        payment=PaymentMethod.CASH,
        status=SaleStatus.COMPLETED,
        created_at_utc=None,
        add_item=False,
    ) -> Sale:
        shop = shop or self.shop
        cashier = cashier or self.cashier
        self._receipt_counter += 1
        sale = Sale.objects.create(
            tenant=self.business,
            shop=shop,
            cashier=cashier,
            receipt_number=f"TEST-{self._receipt_counter:06d}",
            total_amount=amount,
            discount_amount=Decimal("0"),
            tax_amount=Decimal("0"),
            net_amount=amount,
            payment_method=payment,
            status=status,
        )
        if created_at_utc:
            Sale.objects.filter(pk=sale.pk).update(created_at=created_at_utc)
            sale.refresh_from_db()
        if add_item:
            SaleItem.objects.create(
                sale=sale,
                product=self.product,
                quantity=Decimal("2"),
                unit_price=Decimal("500.00"),
                discount=Decimal("0"),
                subtotal=Decimal("1000.00"),
            )
        return sale

    # ── Test 1: Owner, no shop_id → business-wide aggregate ───────────────────

    def test_owner_no_shop_id_aggregates_all_shops(self):
        start, _ = _today_utc_range()
        mid = start + timedelta(hours=5)
        self._make_sale(shop=self.shop, amount=Decimal("1000.00"), created_at_utc=mid)
        self._make_sale(shop=self.shop2, amount=Decimal("2000.00"), created_at_utc=mid)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT)

        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["success"])
        self.assertEqual(res.data["today"]["sales_count"], 2)
        self.assertAlmostEqual(res.data["today"]["gross_sales_amount"], 3000.0, places=2)
        self.assertIsNone(res.data["scope"]["shop_id"])

    # ── Test 2: Owner with shop_id → scoped ───────────────────────────────────

    def test_owner_with_shop_id_scopes_to_shop(self):
        start, _ = _today_utc_range()
        mid = start + timedelta(hours=5)
        self._make_sale(shop=self.shop, amount=Decimal("1000.00"), created_at_utc=mid)
        self._make_sale(shop=self.shop2, amount=Decimal("2000.00"), created_at_utc=mid)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT, {"shop_id": str(self.shop.id)})

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["today"]["sales_count"], 1)
        self.assertAlmostEqual(res.data["today"]["gross_sales_amount"], 1000.0, places=2)
        self.assertEqual(res.data["scope"]["shop_id"], str(self.shop.id))
        self.assertEqual(res.data["scope"]["shop_name"], "Main Shop")

    # ── Test 3: Cashier → forced to default_shop, shift populated ─────────────

    def test_cashier_forced_to_default_shop_shift_populated(self):
        start, _ = _today_utc_range()
        mid = start + timedelta(hours=5)
        # Sale at default_shop
        self._make_sale(shop=self.shop, cashier=self.cashier,
                        amount=Decimal("500.00"), created_at_utc=mid)
        # Sale at shop2 — should NOT be counted even if cashier sold it
        self._make_sale(shop=self.shop2, cashier=self.cashier,
                        amount=Decimal("999.00"), created_at_utc=mid)

        self.client.force_authenticate(user=self.cashier)
        res = self.client.get(ENDPOINT)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["today"]["sales_count"], 1)
        self.assertAlmostEqual(res.data["today"]["gross_sales_amount"], 500.0, places=2)
        self.assertEqual(res.data["scope"]["shop_id"], str(self.shop.id))
        shift = res.data["shift"]
        self.assertEqual(shift["cashier_id"], str(self.cashier.id))
        self.assertIsNotNone(shift["shift_started_at"])
        self.assertEqual(shift["sales_count"], 1)

    # ── Test 4: Cashier with no default_shop → 400 ────────────────────────────

    def test_cashier_no_default_shop_returns_400(self):
        homeless = CustomUser.objects.create(
            phone="+249900000003",
            full_name="Homeless Cashier",
            role="cashier",
            business=self.business,
            is_active=True,
        )
        self.client.force_authenticate(user=homeless)
        res = self.client.get(ENDPOINT)
        self.assertEqual(res.status_code, 400)

    # ── Test 5: UTC boundary correctness ──────────────────────────────────────

    def test_utc_boundary_last_second_of_today_is_included(self):
        start, end = _today_utc_range()
        # 1 minute before midnight local = still today
        just_before = end - timedelta(seconds=61)
        # 1 second after midnight local = tomorrow, must NOT be included
        just_after = end + timedelta(seconds=1)

        self._make_sale(amount=Decimal("100.00"), created_at_utc=just_before)
        self._make_sale(amount=Decimal("999.00"), created_at_utc=just_after)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT)

        self.assertEqual(res.data["today"]["sales_count"], 1)
        self.assertAlmostEqual(res.data["today"]["gross_sales_amount"], 100.0, places=2)

    # ── Test 6: Sparkline zero-fill ───────────────────────────────────────────

    def test_sparkline_includes_zero_filled_hours(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT)

        self.assertEqual(res.status_code, 200)
        points = res.data["sparkline"]["points"]
        self.assertGreater(len(points), 0)
        self.assertEqual(res.data["sparkline"]["interval"], "hour")
        for p in points:
            self.assertIn("label", p)
            self.assertIn("amount", p)
            self.assertIn("sales_count", p)
        # No sales → all amounts are 0.0
        self.assertTrue(all(p["amount"] == 0.0 for p in points))

    # ── Test 7: Refunds excluded from gross, counted in refund fields ──────────

    def test_refunds_excluded_from_gross_counted_separately(self):
        start, _ = _today_utc_range()
        mid = start + timedelta(hours=5)
        self._make_sale(amount=Decimal("1000.00"),
                        status=SaleStatus.COMPLETED, created_at_utc=mid)
        self._make_sale(amount=Decimal("200.00"),
                        status=SaleStatus.REFUNDED, created_at_utc=mid)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT)

        today = res.data["today"]
        self.assertAlmostEqual(today["gross_sales_amount"], 1000.0, places=2)
        self.assertAlmostEqual(today["refund_amount"], 200.0, places=2)
        self.assertEqual(today["refund_count"], 1)
        self.assertAlmostEqual(today["net_sales_amount"], 800.0, places=2)
        self.assertEqual(today["sales_count"], 1)  # refunded sale not counted

    # ── Test 8: CANCELLED + PENDING excluded entirely ─────────────────────────

    def test_cancelled_and_pending_sales_excluded(self):
        start, _ = _today_utc_range()
        mid = start + timedelta(hours=5)
        self._make_sale(amount=Decimal("1000.00"),
                        status=SaleStatus.COMPLETED, created_at_utc=mid)
        self._make_sale(amount=Decimal("500.00"),
                        status=SaleStatus.CANCELLED, created_at_utc=mid)
        self._make_sale(amount=Decimal("300.00"),
                        status=SaleStatus.PENDING, created_at_utc=mid)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT)

        self.assertEqual(res.data["today"]["sales_count"], 1)
        self.assertAlmostEqual(res.data["today"]["gross_sales_amount"], 1000.0, places=2)

    # ── Test 9: top_sellers_limit clamped to 20 ───────────────────────────────

    def test_top_sellers_limit_clamped_to_20(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT, {"top_sellers_limit": "999"})
        self.assertEqual(res.status_code, 200)
        # top_sellers is empty (no sales), verifying no 400/500
        self.assertIsInstance(res.data["top_sellers"], list)

    # ── Test 10: All amounts 0.0 (not null) when no sales ─────────────────────

    def test_all_amounts_are_zero_float_when_no_sales(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT)

        today = res.data["today"]
        self.assertEqual(today["gross_sales_amount"], 0.0)
        self.assertEqual(today["net_sales_amount"], 0.0)
        self.assertEqual(today["sales_count"], 0)
        self.assertEqual(today["average_sale_amount"], 0.0)
        self.assertEqual(today["refund_amount"], 0.0)
        self.assertEqual(today["refund_count"], 0)
        self.assertEqual(today["cash_amount"], 0.0)
        self.assertEqual(today["bankak_amount"], 0.0)

    # ── Test 11: Cache hit returns same last_calculated_at ────────────────────

    def test_cache_hit_returns_same_last_calculated_at(self):
        self.client.force_authenticate(user=self.owner)
        res1 = self.client.get(ENDPOINT)
        res2 = self.client.get(ENDPOINT)
        self.assertEqual(
            res1.data["sync"]["last_calculated_at"],
            res2.data["sync"]["last_calculated_at"],
        )

    # ── Test 12: Invalid date format → 400 ────────────────────────────────────

    def test_invalid_date_format_returns_400(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT, {"date": "14-05-2026"})
        self.assertEqual(res.status_code, 400)

    # ── Test 13: Future date → 400 ────────────────────────────────────────────

    def test_future_date_returns_400(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT, {"date": "2099-01-01"})
        self.assertEqual(res.status_code, 400)

    # ── Test 14: shop_id from another business → 404 ─────────────────────────

    def test_shop_id_from_other_business_returns_404(self):
        other_owner = CustomUser.objects.create(
            phone="+249900000099",
            full_name="Other Owner",
            role="owner",
            is_active=True,
        )
        other_biz = Business.objects.create(
            name="Other Business",
            owner=other_owner,
        )
        foreign_shop = Shop.objects.create(
            business=other_biz,
            name="Foreign Shop",
            is_main=True,
            is_active=True,
        )

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(ENDPOINT, {"shop_id": str(foreign_shop.id)})
        self.assertEqual(res.status_code, 404)
```

- [ ] **Step 3: Run tests — expect all to fail**

```bash
docker exec amanapos_app python manage.py test apps.sales.tests.test_dashboard_summary -v 2
```

Expected: 14 failures — `AttributeError: type object 'Business' has no attribute 'currency'` and `404` on the endpoint (not yet registered).

---

## Task 4: Implement DashboardSummaryView + register URL

**Files:**
- Modify: `backend/apps/sales/views.py`
- Modify: `backend/apps/sales/urls.py`

- [ ] **Step 1: Add DashboardSummaryView to views.py**

Append the following class to the end of `backend/apps/sales/views.py` (after the `_fail` helper, currently line 378):

```python

class DashboardSummaryView(APIView):
    """
    GET /api/v1/sales/dashboard-summary/

    Returns today's sales summary, shift data (cashiers only), hourly sparkline,
    and top sellers. 60-second cache keyed per tenant/shop/date/user scope.
    All amounts are float, never null.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):  # noqa: C901
        import zoneinfo
        from datetime import date as date_cls
        from datetime import datetime, timedelta
        from datetime import time as dt_time

        from django.core.cache import cache
        from django.db.models import Count, Min, Q, Sum
        from django.db.models.functions import TruncHour
        from django.utils import timezone as dj_tz

        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        tz = zoneinfo.ZoneInfo(tenant.timezone)
        now_local = datetime.now(tz)

        # ── Date param ────────────────────────────────────────────────────────
        date_str = request.query_params.get("date")
        if date_str:
            try:
                target_date = date_cls.fromisoformat(date_str)
            except ValueError:
                return Response(
                    {"success": False, "message": "date must be YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if target_date > now_local.date():
                return Response(
                    {"success": False, "message": "date cannot be in the future"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            target_date = now_local.date()

        # ── Shop scoping ──────────────────────────────────────────────────────
        user = request.user
        shop = None

        if user.role == "cashier":
            if not user.default_shop_id:
                return Response(
                    {"success": False, "message": "Cashier has no assigned shop"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            shop = user.default_shop
        else:
            shop_id = request.query_params.get("shop_id")
            if shop_id:
                try:
                    shop = Shop.objects.get(pk=shop_id, business=tenant, is_active=True)
                except Shop.DoesNotExist:
                    raise NotFound("Shop not found.")

        # ── top_sellers_limit ─────────────────────────────────────────────────
        try:
            limit = int(request.query_params.get("top_sellers_limit", 5))
        except (ValueError, TypeError):
            limit = 5
        limit = min(max(limit, 1), 20)

        # ── Cache ─────────────────────────────────────────────────────────────
        cashier_scope = str(user.id) if user.role == "cashier" else "any"
        cache_key = (
            f"dsb:{tenant.id}:{shop.id if shop else 'all'}:"
            f"{target_date}:{user.role}:{cashier_scope}:{limit}"
        )
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        # ── UTC range (index-friendly) ────────────────────────────────────────
        local_start = datetime.combine(target_date, dt_time.min).replace(tzinfo=tz)
        start_utc = local_start.astimezone(zoneinfo.ZoneInfo("UTC"))
        end_utc = start_utc + timedelta(days=1)

        # ── Base filter dict (reused across queries) ──────────────────────────
        base_filter = {
            "tenant": tenant,
            "status": SaleStatus.COMPLETED,
            "created_at__gte": start_utc,
            "created_at__lt": end_utc,
        }
        if shop:
            base_filter["shop"] = shop
        base_qs = Sale.objects.filter(**base_filter)

        # ── Query 1: today aggregates ─────────────────────────────────────────
        today_agg = base_qs.aggregate(
            gross=Sum("total_amount"),
            sales_count=Count("id"),
            cash=Sum("total_amount", filter=Q(payment_method=PaymentMethod.CASH)),
            bankak=Sum("total_amount", filter=Q(payment_method=PaymentMethod.BANKAK)),
        )

        # ── Query 2: refunds (separate status filter) ─────────────────────────
        refund_filter = {
            "tenant": tenant,
            "status__in": [SaleStatus.REFUNDED, SaleStatus.PARTIAL_REFUND],
            "created_at__gte": start_utc,
            "created_at__lt": end_utc,
        }
        if shop:
            refund_filter["shop"] = shop
        refund_agg = Sale.objects.filter(**refund_filter).aggregate(
            refund_amount=Sum("total_amount"),
            refund_count=Count("id"),
        )

        gross = float(today_agg["gross"] or 0)
        sales_count = today_agg["sales_count"] or 0
        refund_amount = float(refund_agg["refund_amount"] or 0)
        refund_count = refund_agg["refund_count"] or 0
        avg_sale = round(gross / sales_count, 2) if sales_count > 0 else 0.0

        # ── Query 3: shift (cashier only) ─────────────────────────────────────
        shift_data = {
            "cashier_id": None,
            "cashier_name": None,
            "shift_started_at": None,
            "gross_sales_amount": 0.0,
            "sales_count": 0,
            "average_sale_amount": 0.0,
        }
        if user.role == "cashier":
            shift_agg = base_qs.filter(cashier=user).aggregate(
                started_at=Min("created_at"),
                gross=Sum("total_amount"),
                count=Count("id"),
            )
            shift_gross = float(shift_agg["gross"] or 0)
            shift_count = shift_agg["count"] or 0
            shift_data = {
                "cashier_id": str(user.id),
                "cashier_name": user.full_name,
                "shift_started_at": (
                    shift_agg["started_at"].isoformat()
                    if shift_agg["started_at"] else None
                ),
                "gross_sales_amount": shift_gross,
                "sales_count": shift_count,
                "average_sale_amount": (
                    round(shift_gross / shift_count, 2) if shift_count > 0 else 0.0
                ),
            }

        # ── Query 4: hourly sparkline (zero-filled) ───────────────────────────
        is_today = target_date == now_local.date()
        max_hour = now_local.hour if is_today else 23

        hourly_rows = (
            base_qs
            .annotate(hour=TruncHour("created_at"))
            .values("hour")
            .annotate(amount=Sum("total_amount"), count=Count("id"))
            .order_by("hour")
        )
        hourly_map = {}
        for row in hourly_rows:
            h = row["hour"].astimezone(tz).hour
            hourly_map[h] = {
                "amount": float(row["amount"] or 0),
                "sales_count": row["count"] or 0,
            }

        sparkline_points = [
            {
                "label": f"{h:02d}:00",
                "amount": hourly_map.get(h, {}).get("amount", 0.0),
                "sales_count": hourly_map.get(h, {}).get("sales_count", 0),
            }
            for h in range(0, max_hour + 1)
        ]

        # ── Query 5: top sellers ──────────────────────────────────────────────
        from apps.core.image_service import build_image_url
        from apps.products.models import Product
        from apps.sales.models import SaleItem

        item_filter = {
            "sale__tenant": tenant,
            "sale__status": SaleStatus.COMPLETED,
            "sale__created_at__gte": start_utc,
            "sale__created_at__lt": end_utc,
        }
        if shop:
            item_filter["sale__shop"] = shop

        top_rows = list(
            SaleItem.objects.filter(**item_filter)
            .values("product_id")
            .annotate(quantity_sold=Sum("quantity"), gross_amount=Sum("subtotal"))
            .order_by("-quantity_sold")[:limit]
        )

        product_ids = [r["product_id"] for r in top_rows]
        products_map = {p.id: p for p in Product.objects.filter(id__in=product_ids)}

        top_sellers = [
            {
                "product_id": str(r["product_id"]),
                "name": products_map[r["product_id"]].name,
                "quantity_sold": float(r["quantity_sold"] or 0),
                "gross_amount": float(r["gross_amount"] or 0),
                "thumbnail_url": build_image_url(
                    products_map[r["product_id"]].thumbnail,
                    request=request,
                    version=(
                        int(products_map[r["product_id"]].updated_at.timestamp())
                        if products_map[r["product_id"]].updated_at else None
                    ),
                ),
            }
            for r in top_rows
            if r["product_id"] in products_map
        ]

        # ── Assemble response ─────────────────────────────────────────────────
        now_utc = dj_tz.now()
        response_data = {
            "success": True,
            "server_time": now_utc.isoformat(),
            "timezone": tenant.timezone,
            "currency": tenant.currency,
            "scope": {
                "business_id": str(tenant.id),
                "shop_id": str(shop.id) if shop else None,
                "shop_name": shop.name if shop else None,
            },
            "today": {
                "date": str(target_date),
                "gross_sales_amount": gross,
                "net_sales_amount": round(gross - refund_amount, 2),
                "sales_count": sales_count,
                "average_sale_amount": avg_sale,
                "refund_amount": refund_amount,
                "refund_count": refund_count,
                "cash_amount": float(today_agg["cash"] or 0),
                "bankak_amount": float(today_agg["bankak"] or 0),
            },
            "shift": shift_data,
            "sparkline": {
                "interval": "hour",
                "points": sparkline_points,
            },
            "top_sellers": top_sellers,
            "sync": {
                "includes_pending_offline_sales": False,
                "last_calculated_at": now_utc.isoformat(),
            },
        }

        cache.set(cache_key, response_data, 60)
        return Response(response_data)
```

- [ ] **Step 2: Register URL**

In `backend/apps/sales/urls.py`, add the dashboard-summary route **before** the `<uuid:pk>/` catch-all:

```python
from django.urls import path
from . import views

app_name = "sales"

urlpatterns = [
    path("", views.SaleListCreateView.as_view(), name="sale_list_create"),
    path("summary/", views.SalesSummaryView.as_view(), name="sale_summary"),
    path("dashboard-summary/", views.DashboardSummaryView.as_view(), name="dashboard_summary"),
    path("offline-sync/", views.OfflineSyncView.as_view(), name="sale_offline_sync"),
    path("<uuid:pk>/", views.SaleDetailView.as_view(), name="sale_detail"),
    path("<uuid:pk>/cancel/", views.SaleCancelView.as_view(), name="sale_cancel"),
]
```

- [ ] **Step 3: Run tests — expect all 14 to pass**

```bash
docker exec amanapos_app python manage.py test apps.sales.tests.test_dashboard_summary -v 2
```

Expected output:
```
test_all_amounts_are_zero_float_when_no_sales ... ok
test_cache_hit_returns_same_last_calculated_at ... ok
test_cancelled_and_pending_sales_excluded ... ok
test_cashier_forced_to_default_shop_shift_populated ... ok
test_cashier_no_default_shop_returns_400 ... ok
test_future_date_returns_400 ... ok
test_invalid_date_format_returns_400 ... ok
test_owner_no_shop_id_aggregates_all_shops ... ok
test_owner_with_shop_id_scopes_to_shop ... ok
test_refunds_excluded_from_gross_counted_separately ... ok
test_shop_id_from_other_business_returns_404 ... ok
test_sparkline_includes_zero_filled_hours ... ok
test_top_sellers_limit_clamped_to_20 ... ok
test_utc_boundary_last_second_of_today_is_included ... ok

Ran 14 tests in X.XXXs
OK
```

- [ ] **Step 4: Restart app and smoke-test**

```bash
docker restart amanapos_app
```

Then call the endpoint with a real token to verify live response:
```bash
curl -s "http://localhost:8080/api/v1/sales/dashboard-summary/" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: <business_uuid>" | python -m json.tool | head -40
```

Expected: JSON with `"success": true`, `"currency": "SDG"`, `"today": {...}` with `0.0` values.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/sales/views.py \
        backend/apps/sales/urls.py \
        backend/apps/sales/tests/__init__.py \
        backend/apps/sales/tests/test_dashboard_summary.py
git commit -m "feat: add GET /api/v1/sales/dashboard-summary/ endpoint"
```
