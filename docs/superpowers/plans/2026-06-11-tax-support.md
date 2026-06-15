# Tax Support (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable, per-business sales tax system to AmanaPOS — enable/disable, single business-wide rate, inclusive/exclusive pricing, and a custom label — computed server-side during sale creation and surfaced in sales, reports, and the mobile bootstrap payload.

**Architecture:** 4 new config fields on `Business` (`tax_enabled`, `tax_name`, `tax_rate`, `tax_inclusive`), 2 new snapshot fields on `Sale` (`tax_rate`, `tax_inclusive`). All calculation happens in `apps.sales.services.create_sale()` using `Decimal` + `ROUND_HALF_UP`. Client-supplied `tax_amount` is removed from input serializers — server is the sole source of truth.

**Tech Stack:** Django 5, DRF, PostgreSQL, `Decimal`/`ROUND_HALF_UP`, pytest (via `docker compose exec app pytest`).

**Spec:** `docs/superpowers/specs/2026-06-11-tax-support-design.md`

---

## File Structure

| File | Change |
|---|---|
| `backend/apps/tenants/models/business.py` | Add `tax_enabled`, `tax_name`, `tax_rate`, `tax_inclusive` fields |
| `backend/apps/tenants/migrations/0008_business_tax_settings.py` | New migration |
| `backend/apps/tenants/serializers.py` | Expose + validate tax fields on `BusinessSerializer`/`BusinessUpdateSerializer` |
| `backend/apps/tenants/tests/__init__.py` | New (test package doesn't exist yet) |
| `backend/apps/tenants/tests/test_business_tax_settings.py` | New — model + API tests |
| `backend/apps/sales/models/sale.py` | Add `tax_rate`, `tax_inclusive` snapshot fields |
| `backend/apps/sales/migrations/0008_sale_tax_snapshot.py` | New migration |
| `backend/apps/sales/services.py` | `create_sale()` server-side tax calc; `get_sales_report()` adds `total_tax_collected` |
| `backend/apps/sales/serializers.py` | Remove client `tax_amount` input; expose `tax_rate`/`tax_inclusive` on `SaleSerializer` |
| `backend/apps/sales/views.py` | Stop passing `tax_amount=` to `create_sale()` |
| `backend/apps/sales/tests/test_sales_v2.py` | New test classes for tax snapshot fields + calculation |
| `backend/apps/offline/serializers.py` | Add tax fields to `BootstrapBusinessSerializer` |
| `backend/apps/offline/tests/__init__.py` | New (test package doesn't exist yet) |
| `backend/apps/offline/tests/test_bootstrap_tax.py` | New — bootstrap tax fields test |

---

### Task 1: Business model — tax config fields + migration

**Files:**
- Modify: `backend/apps/tenants/models/business.py`
- Create: `backend/apps/tenants/migrations/0008_business_tax_settings.py`
- Create: `backend/apps/tenants/tests/__init__.py`
- Create: `backend/apps/tenants/tests/test_business_tax_settings.py`

- [ ] **Step 1: Write the failing test**

Create `backend/apps/tenants/tests/__init__.py` (empty file).

Create `backend/apps/tenants/tests/test_business_tax_settings.py`:

```python
import uuid
from decimal import Decimal

from django.test import TestCase

from apps.accounts.models import CustomUser
from apps.tenants.models import Business


def make_owner(phone="+249900000010"):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Owner", role="owner", is_active=True,
    )


def make_business(owner):
    return Business.objects.create(
        owner=owner, name="Tax Test Biz", slug=f"tax-test-biz-{uuid.uuid4().hex[:6]}",
        business_type="shop",
    )


class TestBusinessTaxFields(TestCase):
    def test_business_has_tax_fields_with_defaults(self):
        owner = make_owner()
        business = make_business(owner)
        self.assertFalse(business.tax_enabled)
        self.assertEqual(business.tax_name, "VAT")
        self.assertEqual(business.tax_rate, Decimal("0"))
        self.assertFalse(business.tax_inclusive)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec app pytest apps/tenants/tests/test_business_tax_settings.py -v`
Expected: FAIL — `AttributeError: 'Business' object has no attribute 'tax_enabled'` (or `TypeError` from `Business.objects.create()` rejecting an unexpected kwarg if the field doesn't exist yet — either way, a clear failure, not a pass).

- [ ] **Step 3: Add the fields to the Business model**

Modify `backend/apps/tenants/models/business.py`. Update the imports at the top of the file:

```python
import uuid
from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify
```

Then add the 4 new fields directly after `timezone` and before `created_at`:

```python
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
```

- [ ] **Step 4: Generate the migration**

Run: `docker compose exec app python manage.py makemigrations tenants`
Expected output: a new file `apps/tenants/migrations/0008_business_tax_settings.py` is created (Django auto-names it; if it picks a different name, rename it to `0008_business_tax_settings.py` for clarity before continuing).

Verify the generated migration matches this shape (edit if needed so it does):

```python
from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0007_inbound_transaction"),
    ]

    operations = [
        migrations.AddField(
            model_name="business",
            name="tax_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="business",
            name="tax_name",
            field=models.CharField(default="VAT", max_length=50),
        ),
        migrations.AddField(
            model_name="business",
            name="tax_rate",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=5,
                validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("100"))],
            ),
        ),
        migrations.AddField(
            model_name="business",
            name="tax_inclusive",
            field=models.BooleanField(default=False),
        ),
    ]
```

- [ ] **Step 5: Apply the migration**

Run: `docker compose exec app python manage.py migrate tenants`
Expected: `Applying tenants.0008_business_tax_settings... OK`

- [ ] **Step 6: Run test to verify it passes**

Run: `docker compose exec app pytest apps/tenants/tests/test_business_tax_settings.py -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/tenants/models/business.py apps/tenants/migrations/0008_business_tax_settings.py apps/tenants/tests/__init__.py apps/tenants/tests/test_business_tax_settings.py
git commit -m "feat(tenants): add configurable tax settings to Business model"
```

---

### Task 2: Sale model — tax snapshot fields + migration

**Files:**
- Modify: `backend/apps/sales/models/sale.py`
- Create: `backend/apps/sales/migrations/0008_sale_tax_snapshot.py`
- Modify (test): `backend/apps/sales/tests/test_sales_v2.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/apps/sales/tests/test_sales_v2.py` (it already imports `uuid`, `Decimal`, `TestCase`, `Sale`, and has `make_owner`/`make_business`/`make_shop` helpers):

```python
class TestSaleTaxSnapshotFields(TestCase):
    def test_sale_has_tax_snapshot_fields_with_defaults(self):
        owner = make_owner(phone="+249900000020")
        business = make_business(owner)
        shop = make_shop(business)
        sale = Sale.objects.create(
            tenant=business,
            shop=shop,
            cashier=owner,
            receipt_number=f"REC-{uuid.uuid4().hex[:8]}",
            total_amount=Decimal("100.00"),
        )
        self.assertEqual(sale.tax_rate, Decimal("0"))
        self.assertFalse(sale.tax_inclusive)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec app pytest apps/sales/tests/test_sales_v2.py::TestSaleTaxSnapshotFields -v`
Expected: FAIL — `TypeError: 'tax_rate' is an invalid keyword argument` is NOT expected here (we don't pass it); instead expect `AttributeError: 'Sale' object has no attribute 'tax_rate'`.

- [ ] **Step 3: Add the fields to the Sale model**

Modify `backend/apps/sales/models/sale.py`. Add `tax_rate` and `tax_inclusive` directly after the existing `tax_amount` field:

```python
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_inclusive = models.BooleanField(default=False)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
```

- [ ] **Step 4: Generate the migration**

Run: `docker compose exec app python manage.py makemigrations sales`
Expected output: a new file `apps/sales/migrations/0008_sale_tax_snapshot.py` (rename to this if Django auto-names it differently).

Verify the generated migration matches this shape:

```python
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0007_sale_dashboard_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="sale",
            name="tax_rate",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name="sale",
            name="tax_inclusive",
            field=models.BooleanField(default=False),
        ),
    ]
```

- [ ] **Step 5: Apply the migration**

Run: `docker compose exec app python manage.py migrate sales`
Expected: `Applying sales.0008_sale_tax_snapshot... OK`

- [ ] **Step 6: Run test to verify it passes**

Run: `docker compose exec app pytest apps/sales/tests/test_sales_v2.py::TestSaleTaxSnapshotFields -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/sales/models/sale.py apps/sales/migrations/0008_sale_tax_snapshot.py apps/sales/tests/test_sales_v2.py
git commit -m "feat(sales): add tax_rate and tax_inclusive snapshot fields to Sale"
```

---

### Task 3: Tenants serializers — expose and validate tax config

**Files:**
- Modify: `backend/apps/tenants/serializers.py`
- Modify (test): `backend/apps/tenants/tests/test_business_tax_settings.py`

- [ ] **Step 1: Write the failing test**

Modify `backend/apps/tenants/tests/test_business_tax_settings.py` — add `APIClient` to the imports and append a new test class:

```python
import uuid
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.tenants.models import Business
```

Append:

```python
class TestBusinessTaxSettingsAPI(TestCase):
    def setUp(self):
        self.owner = make_owner(phone="+249900000011")
        self.business = make_business(self.owner)
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

    def test_business_detail_includes_tax_fields(self):
        response = self.client.get(f"/api/v1/tenants/businesses/{self.business.id}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["tax_enabled"], False)
        self.assertEqual(data["tax_name"], "VAT")
        self.assertEqual(Decimal(data["tax_rate"]), Decimal("0"))
        self.assertEqual(data["tax_inclusive"], False)

    def test_owner_can_update_tax_settings(self):
        response = self.client.patch(
            f"/api/v1/tenants/businesses/{self.business.id}/",
            {"tax_enabled": True, "tax_name": "GST", "tax_rate": "17.00", "tax_inclusive": True},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.business.refresh_from_db()
        self.assertTrue(self.business.tax_enabled)
        self.assertEqual(self.business.tax_name, "GST")
        self.assertEqual(self.business.tax_rate, Decimal("17.00"))
        self.assertTrue(self.business.tax_inclusive)

    def test_tax_rate_above_100_is_rejected(self):
        response = self.client.patch(
            f"/api/v1/tenants/businesses/{self.business.id}/",
            {"tax_rate": "150.00"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_negative_tax_rate_is_rejected(self):
        response = self.client.patch(
            f"/api/v1/tenants/businesses/{self.business.id}/",
            {"tax_rate": "-5.00"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec app pytest apps/tenants/tests/test_business_tax_settings.py::TestBusinessTaxSettingsAPI -v`
Expected: FAIL — `KeyError: 'tax_enabled'` on `test_business_detail_includes_tax_fields` (field not in serializer output yet).

- [ ] **Step 3: Update BusinessSerializer and BusinessUpdateSerializer**

Modify `backend/apps/tenants/serializers.py`. Update `BusinessSerializer.Meta.fields`:

```python
    class Meta:
        model = Business
        fields = [
            "id", "name", "slug", "business_type", "owner", "logo",
            "address", "phone", "email",
            "tax_enabled", "tax_name", "tax_rate", "tax_inclusive",
            "active_subscription", "is_active", "shop_count", "shops",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "owner", "created_at", "updated_at"]
```

Update `BusinessUpdateSerializer`:

```python
class BusinessUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Business
        fields = [
            "name", "address", "phone", "email", "logo", "is_active", "business_type",
            "tax_enabled", "tax_name", "tax_rate", "tax_inclusive",
        ]

    def validate_email(self, value):
        return value or ""

    def validate_tax_rate(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Tax rate must be between 0 and 100.")
        return value
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec app pytest apps/tenants/tests/test_business_tax_settings.py -v`
Expected: PASS (all 5 tests in the file)

- [ ] **Step 5: Commit**

```bash
git add apps/tenants/serializers.py apps/tenants/tests/test_business_tax_settings.py
git commit -m "feat(tenants): expose and validate tax settings via Business API"
```

---

### Task 4: Sales service — server-side tax calculation in create_sale()

**Files:**
- Modify: `backend/apps/sales/services.py`
- Modify: `backend/apps/sales/views.py`
- Modify (test): `backend/apps/sales/tests/test_sales_v2.py`

This task changes `create_sale()`'s signature (removes `tax_amount` param), so the two call sites in `views.py` that pass `tax_amount=` must be updated in the same commit — otherwise existing tests break with `TypeError: create_sale() got an unexpected keyword argument 'tax_amount'`.

- [ ] **Step 1: Write the failing tests**

Append to `backend/apps/sales/tests/test_sales_v2.py` (it already has `make_owner`, `make_business`, `make_shop`, `make_product`, `seed_stock`, `make_auth_client`, `create_sale_via_api` helpers, and imports `Sale`):

```python
class TestSaleTaxCalculation(TestCase):
    def setUp(self):
        self.owner = make_owner(phone="+249900000021")
        self.business = make_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business, price="100.00")
        seed_stock(self.product, self.shop, qty=50)
        self.client = make_auth_client(self.owner)

    def test_tax_disabled_no_change(self):
        resp = create_sale_via_api(self.client, self.shop, self.product, qty=2)
        self.assertEqual(resp.status_code, 201)
        sale = Sale.objects.get(pk=resp.data["data"]["id"])
        self.assertEqual(sale.total_amount, Decimal("200.00"))
        self.assertEqual(sale.tax_amount, Decimal("0"))
        self.assertEqual(sale.net_amount, Decimal("200.00"))
        self.assertEqual(sale.tax_rate, Decimal("0"))
        self.assertFalse(sale.tax_inclusive)

    def test_exclusive_tax_added_on_top(self):
        self.business.tax_enabled = True
        self.business.tax_rate = Decimal("17.00")
        self.business.tax_inclusive = False
        self.business.save()

        resp = create_sale_via_api(self.client, self.shop, self.product, qty=2)
        self.assertEqual(resp.status_code, 201)
        sale = Sale.objects.get(pk=resp.data["data"]["id"])
        self.assertEqual(sale.total_amount, Decimal("200.00"))
        self.assertEqual(sale.tax_amount, Decimal("34.00"))
        self.assertEqual(sale.net_amount, Decimal("234.00"))
        self.assertEqual(sale.tax_rate, Decimal("17.00"))
        self.assertFalse(sale.tax_inclusive)

    def test_inclusive_tax_extracted_from_price(self):
        self.business.tax_enabled = True
        self.business.tax_rate = Decimal("17.00")
        self.business.tax_inclusive = True
        self.business.save()

        resp = create_sale_via_api(self.client, self.shop, self.product, qty=2)
        self.assertEqual(resp.status_code, 201)
        sale = Sale.objects.get(pk=resp.data["data"]["id"])
        self.assertEqual(sale.total_amount, Decimal("200.00"))
        # 200 - (200 / 1.17) = 29.06 (rounded half-up to 2dp)
        self.assertEqual(sale.tax_amount, Decimal("29.06"))
        self.assertEqual(sale.net_amount, Decimal("200.00"))
        self.assertEqual(sale.tax_rate, Decimal("17.00"))
        self.assertTrue(sale.tax_inclusive)
```

- [ ] **Step 2: Run tests to verify failure**

Run: `docker compose exec app pytest apps/sales/tests/test_sales_v2.py::TestSaleTaxCalculation -v`
Expected: `test_tax_disabled_no_change` PASSES already (current behavior matches). `test_exclusive_tax_added_on_top` and `test_inclusive_tax_extracted_from_price` FAIL — `tax_amount` stays `0` and `net_amount` stays `200.00` because `create_sale()` doesn't yet read `tenant.tax_*`.

- [ ] **Step 3: Rewrite create_sale() tax calculation**

Modify `backend/apps/sales/services.py`. Update the `decimal` import at the top of the file:

```python
from decimal import Decimal, ROUND_HALF_UP
```

Remove the `tax_amount` parameter from `create_sale()`'s signature:

```python
@transaction.atomic
def create_sale(
    tenant: Business,
    shop: Shop,
    cashier,
    items: list[dict],
    payment_method: str = PaymentMethod.CASH,
    customer=None,
    discount_amount: Decimal = Decimal("0"),
    notes: str = "",
    client_sale_id: str | None = None,
    synced_at=None,
) -> Sale:
```

Update the docstring's `Args:` section — remove the `tax_amount:` line:

```python
    Args:
        tenant: The business making the sale.
        shop: The shop where the sale is made.
        cashier: The user (cashier) processing the sale.
        items: List of dicts: [{product_id, quantity, unit_price, discount}]
        payment_method: Payment method string.
        customer: Optional Customer instance.
        discount_amount: Overall sale discount.
        notes: Optional notes.
        client_sale_id: Mobile UUID for offline idempotency (None for online sales).
        synced_at: Timestamp when this offline sale was received by the server.
```

Replace the `# Calculate net amount` block and the `Sale.objects.create(...)` call with:

```python
    # Calculate tax and net amount (server-side, single business-wide rate)
    taxable_amount = total_amount - discount_amount

    if tenant.tax_enabled:
        rate = tenant.tax_rate / Decimal("100")
        if tenant.tax_inclusive:
            # Product price already includes tax — extract it for reporting.
            tax_amount = taxable_amount - (taxable_amount / (Decimal("1") + rate))
            net_amount = taxable_amount
        else:
            # Tax added on top of the listed price.
            tax_amount = taxable_amount * rate
            net_amount = taxable_amount + tax_amount

        tax_amount = tax_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        net_amount = net_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    else:
        tax_amount = Decimal("0")
        net_amount = taxable_amount

    # Create the Sale record
    sale = Sale.objects.create(
        tenant=tenant,
        shop=shop,
        cashier=cashier,
        customer=customer,
        receipt_number=generate_receipt_number("REC"),
        total_amount=total_amount,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        tax_rate=tenant.tax_rate,
        tax_inclusive=tenant.tax_inclusive,
        net_amount=net_amount,
        payment_method=payment_method,
        bankak_account_snapshot=bankak_snapshot,
        status=SaleStatus.COMPLETED,
        notes=notes,
        client_sale_id=client_sale_id or None,
        synced_at=synced_at,
    )
```

- [ ] **Step 4: Update call sites in views.py**

Modify `backend/apps/sales/views.py`. In `SaleListCreateView.post()`, remove the `tax_amount=` line from the `create_sale(...)` call:

```python
        sale = create_sale(
            tenant=tenant,
            shop=shop,
            cashier=request.user,
            items=data["items"],
            payment_method=data["payment_method"],
            customer=customer,
            discount_amount=data.get("discount_amount", Decimal("0")),
            notes=data.get("notes", ""),
        )
```

In `_sync_one_sale()`, remove the `tax_amount=` line from the `create_sale(...)` call:

```python
        sale = create_sale(
            tenant=tenant,
            shop=shop,
            cashier=request.user,
            items=items,
            payment_method=sale_data.get("payment_method", PaymentMethod.CASH),
            customer=customer,
            discount_amount=sale_data.get("discount_amount", Decimal("0")),
            notes=sale_data.get("notes", ""),
            client_sale_id=client_sale_id,
            synced_at=synced_at,
        )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `docker compose exec app pytest apps/sales/tests/test_sales_v2.py -v`
Expected: PASS — all tests in the file, including the 3 new `TestSaleTaxCalculation` tests and the existing offline sync / refund tests (which still pass `tax_amount` in their request payloads but no longer error since the param is simply absent from `create_sale()` and unused validated data is dropped — covered fully in Task 5).

- [ ] **Step 6: Commit**

```bash
git add apps/sales/services.py apps/sales/views.py apps/sales/tests/test_sales_v2.py
git commit -m "feat(sales): compute tax server-side in create_sale()"
```

---

### Task 5: Sales serializers — remove client tax_amount, expose snapshot fields

**Files:**
- Modify: `backend/apps/sales/serializers.py`
- Modify (test): `backend/apps/sales/tests/test_sales_v2.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/apps/sales/tests/test_sales_v2.py`:

```python
class TestSaleSerializerTaxFields(TestCase):
    def test_sale_response_includes_tax_snapshot_fields(self):
        owner = make_owner(phone="+249900000022")
        business = make_business(owner)
        business.tax_enabled = True
        business.tax_rate = Decimal("17.00")
        business.tax_inclusive = False
        business.save()
        shop = make_shop(business)
        product = make_product(business, price="100.00")
        seed_stock(product, shop, qty=10)
        client = make_auth_client(owner)

        resp = create_sale_via_api(client, shop, product, qty=1)
        self.assertEqual(resp.status_code, 201)
        data = resp.data["data"]
        self.assertEqual(Decimal(data["tax_rate"]), Decimal("17.00"))
        self.assertEqual(data["tax_inclusive"], False)
        self.assertEqual(Decimal(data["tax_amount"]), Decimal("17.00"))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec app pytest apps/sales/tests/test_sales_v2.py::TestSaleSerializerTaxFields -v`
Expected: FAIL — `KeyError: 'tax_rate'` (not yet in `SaleSerializer` output).

- [ ] **Step 3: Update SaleSerializer and remove client tax_amount input**

Modify `backend/apps/sales/serializers.py`. Update `SaleSerializer`:

```python
class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    cashier_name = serializers.CharField(source="cashier.full_name", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id", "tenant", "shop", "shop_name", "cashier", "cashier_name",
            "customer", "customer_name", "receipt_number",
            "total_amount", "discount_amount", "tax_amount", "tax_rate", "tax_inclusive", "net_amount",
            "payment_method", "bankak_account_snapshot", "status", "notes", "item_count",
            "items", "synced_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "tenant", "receipt_number", "tax_amount", "tax_rate", "tax_inclusive", "net_amount",
            "created_at", "updated_at", "synced_at",
        ]
```

Remove `tax_amount` and `validate_tax_amount` from `CreateSaleSerializer`:

```python
class CreateSaleSerializer(serializers.Serializer):
    """Input serializer for creating a new sale."""
    shop = serializers.UUIDField()
    items = SaleItemInputSerializer(many=True, min_length=1)
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    customer = serializers.UUIDField(required=False, allow_null=True)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0"))
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_discount_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Discount cannot be negative.")
        return value
```

Remove `tax_amount` and `validate_tax_amount` from `OfflineSaleInputSerializer`:

```python
class OfflineSaleInputSerializer(serializers.Serializer):
    """One sale inside the offline sync batch."""
    client_sale_id = serializers.UUIDField(
        help_text="Mobile-generated UUID. Re-submitting the same ID is idempotent.",
    )
    shop = serializers.UUIDField()
    customer = serializers.UUIDField(required=False, allow_null=True)
    payment_method = serializers.ChoiceField(
        choices=PaymentMethod.choices, default=PaymentMethod.CASH,
    )
    discount_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, default=Decimal("0"),
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    # Client's claimed creation time (stored for reference; server timestamp used as DB created_at)
    created_at = serializers.DateTimeField(required=False, allow_null=True)
    items = OfflineSaleItemSerializer(many=True, min_length=1)

    def validate_discount_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Discount cannot be negative.")
        return value
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose exec app pytest apps/sales/tests/test_sales_v2.py -v`
Expected: PASS — all tests, including the new `TestSaleSerializerTaxFields`.

- [ ] **Step 5: Run the full sales test suite to confirm no regressions**

Run: `docker compose exec app pytest apps/sales/ -v`
Expected: PASS — including offline sync and dashboard summary tests (a stray `tax_amount` key in an offline sync payload is now simply ignored by the serializer, same as any unknown input field).

- [ ] **Step 6: Commit**

```bash
git add apps/sales/serializers.py apps/sales/tests/test_sales_v2.py
git commit -m "feat(sales): expose tax snapshot fields and remove client-supplied tax_amount"
```

---

### Task 6: Sales report — total_tax_collected summary field

**Files:**
- Modify: `backend/apps/sales/services.py`
- Modify (test): `backend/apps/sales/tests/test_sales_v2.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/apps/sales/tests/test_sales_v2.py`:

```python
class TestSalesReportTaxSummary(TestCase):
    def test_total_tax_collected_in_summary(self):
        import zoneinfo
        from datetime import datetime

        from apps.sales.services import get_sales_report

        owner = make_owner(phone="+249900000023")
        business = make_business(owner)
        business.tax_enabled = True
        business.tax_rate = Decimal("17.00")
        business.tax_inclusive = False
        business.save()
        shop = make_shop(business)
        product = make_product(business, price="100.00")
        seed_stock(product, shop, qty=10)
        client = make_auth_client(owner)

        resp = create_sale_via_api(client, shop, product, qty=2)
        self.assertEqual(resp.status_code, 201)

        tz = zoneinfo.ZoneInfo(business.timezone)
        today = datetime.now(tz).date()
        report = get_sales_report(tenant=business, date_from=today, date_to=today)

        self.assertIn("total_tax_collected", report["summary"])
        self.assertEqual(report["summary"]["total_tax_collected"], 34.0)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec app pytest apps/sales/tests/test_sales_v2.py::TestSalesReportTaxSummary -v`
Expected: FAIL — `KeyError: 'total_tax_collected'` (not yet in the `summary` dict).

- [ ] **Step 3: Add total_tax_collected to get_sales_report()**

Modify `backend/apps/sales/services.py`. In `get_sales_report()`, update the `totals` aggregate and `summary` dict:

```python
    # ── Summary ──────────────────────────────────────────────────────────────
    totals = base_qs.aggregate(
        gross=Sum("total_amount"), net=Sum("net_amount"), tax=Sum("tax_amount"), count=Count("id"),
    )
    refund_totals = refund_qs.aggregate(amount=Sum("net_amount"), count=Count("id"))

    gross = totals["gross"] or Decimal("0")
    net = totals["net"] or Decimal("0")
    sales_count = totals["count"] or 0
    avg_sale = (net / sales_count) if sales_count else Decimal("0")

    summary = {
        "gross_sales_amount": float(gross),
        "net_sales_amount": float(net),
        "total_tax_collected": float(totals["tax"] or 0),
        "sales_count": sales_count,
        "average_sale_amount": float(round(avg_sale, 2)),
        "refund_amount": float(refund_totals["amount"] or 0),
        "refund_count": refund_totals["count"] or 0,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec app pytest apps/sales/tests/test_sales_v2.py::TestSalesReportTaxSummary -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/sales/services.py apps/sales/tests/test_sales_v2.py
git commit -m "feat(sales): add total_tax_collected to sales report summary"
```

---

### Task 7: Mobile bootstrap — expose business tax config

**Files:**
- Modify: `backend/apps/offline/serializers.py`
- Create: `backend/apps/offline/tests/__init__.py`
- Create: `backend/apps/offline/tests/test_bootstrap_tax.py`

- [ ] **Step 1: Write the failing test**

Create `backend/apps/offline/tests/__init__.py` (empty file).

Create `backend/apps/offline/tests/test_bootstrap_tax.py`:

```python
import uuid
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.tenants.models import Business


def make_owner(phone="+249900000030"):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Owner", role="owner", is_active=True,
    )


def make_business(owner):
    return Business.objects.create(
        owner=owner, name="Bootstrap Tax Biz", slug=f"bootstrap-tax-biz-{uuid.uuid4().hex[:6]}",
        business_type="shop",
    )


class TestBootstrapBusinessTaxFields(TestCase):
    def test_bootstrap_includes_business_tax_fields(self):
        owner = make_owner()
        business = make_business(owner)
        business.tax_enabled = True
        business.tax_name = "VAT"
        business.tax_rate = Decimal("17.00")
        business.tax_inclusive = True
        business.save()

        client = APIClient()
        client.force_authenticate(user=owner)

        resp = client.get("/api/v1/offline/bootstrap/")
        self.assertEqual(resp.status_code, 200)
        biz = resp.json()["businesses"][0]
        self.assertEqual(biz["tax_enabled"], True)
        self.assertEqual(biz["tax_name"], "VAT")
        self.assertEqual(Decimal(biz["tax_rate"]), Decimal("17.00"))
        self.assertEqual(biz["tax_inclusive"], True)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec app pytest apps/offline/tests/test_bootstrap_tax.py -v`
Expected: FAIL — `KeyError: 'tax_enabled'` (not yet in `BootstrapBusinessSerializer` output).

- [ ] **Step 3: Update BootstrapBusinessSerializer**

Modify `backend/apps/offline/serializers.py`:

```python
class BootstrapBusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = [
            "id", "name", "slug", "business_type",
            "address", "phone", "email",
            "currency", "timezone",
            "tax_enabled", "tax_name", "tax_rate", "tax_inclusive",
            "is_active", "updated_at",
        ]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec app pytest apps/offline/tests/test_bootstrap_tax.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/offline/serializers.py apps/offline/tests/__init__.py apps/offline/tests/test_bootstrap_tax.py
git commit -m "feat(offline): expose business tax settings in bootstrap payload"
```

---

### Task 8: Full regression run

**Files:** None (verification only)

- [ ] **Step 1: Run the full backend test suite**

Run: `docker compose exec app pytest -v`
Expected: PASS — all tests across `apps/tenants/`, `apps/sales/`, `apps/offline/`, and every other app, with no regressions from the tax changes.

- [ ] **Step 2: Run Django system checks**

Run: `docker compose exec app python manage.py check`
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 3: Confirm migrations are up to date**

Run: `docker compose exec app python manage.py makemigrations --check --dry-run`
Expected: `No changes detected` (exit code 0) — confirms the `0008_business_tax_settings` and `0008_sale_tax_snapshot` migrations fully capture the model changes.
