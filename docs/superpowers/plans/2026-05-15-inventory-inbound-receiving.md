# Inventory Inbound Receiving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a premium-gated `POST /api/v1/inventory/inbound/` endpoint that records a supplier stock delivery as a single auditable transaction — incrementing stock levels, creating stock movements, and optionally tracking batches with expiry dates.

**Architecture:** A new `InboundTransaction` + `InboundTransactionItem` model pair stores the inbound header/lines; the existing `add_stock()` service handles stock level + movement writes; a new `inbound_receive()` service orchestrates everything in one atomic transaction with duplicate-reference protection. Feature entitlement is enforced via the existing `require_feature()` guard in `apps/subscriptions/guards.py`. The feature key `inventory_inbound_receiving` must be present and truthy in the business's active plan's `features` JSON field. The feature is exposed to mobile via a new `enabled_features` field on the profile endpoint.

**Tech Stack:** Django 5, DRF, PostgreSQL, existing guard infrastructure (`apps/subscriptions/guards.py`), `apps/inventory/services.py::add_stock()`, `apps/inventory/models::MovementType`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `backend/apps/inventory/models/inbound.py` | `InboundTransaction` + `InboundTransactionItem` models |
| Modify | `backend/apps/inventory/models/__init__.py` | Export new models |
| Create | `backend/apps/inventory/migrations/0006_inbound_transaction.py` | DB migration |
| Modify | `backend/apps/inventory/services.py` | Add `inbound_receive()` |
| Create | `backend/apps/inventory/tests/test_inbound.py` | All inbound tests |
| Modify | `backend/apps/inventory/serializers.py` | `InboundReceiveSerializer` (input) + `InboundTransactionSerializer` (output) |
| Modify | `backend/apps/inventory/views.py` | `InboundReceiveView` |
| Modify | `backend/apps/inventory/urls.py` | Wire `inbound/` path |
| Modify | `backend/apps/accounts/serializers.py` | Add `enabled_features` to `UserProfileSerializer` |
| Create | `backend/apps/accounts/tests/test_profile_features.py` | Test `enabled_features` in profile |

---

### Task 1: Add `InboundTransaction` + `InboundTransactionItem` models + migration

**Files:**
- Create: `backend/apps/inventory/models/inbound.py`
- Modify: `backend/apps/inventory/models/__init__.py`
- Create: `backend/apps/inventory/migrations/0006_inbound_transaction.py`

- [ ] **Step 1: Write the model file**

Create `backend/apps/inventory/models/inbound.py`:

```python
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
```

- [ ] **Step 2: Export new models from `__init__.py`**

Edit `backend/apps/inventory/models/__init__.py` — replace the full file content:

```python
from .batch import ProductBatch
from .inbound import InboundTransaction, InboundTransactionItem
from .movement import MovementType, StockMovement
from .stock_level import StockLevel

__all__ = [
    "InboundTransaction",
    "InboundTransactionItem",
    "MovementType",
    "ProductBatch",
    "StockMovement",
    "StockLevel",
]
```

- [ ] **Step 3: Generate and apply migration**

```bash
cd backend
python manage.py makemigrations inventory --name inbound_transaction
python manage.py migrate inventory
```

Expected: new migration file `0006_inbound_transaction.py` and successful DB migration with tables `inventory_inbound_transactions` and `inventory_inbound_transaction_items`.

- [ ] **Step 4: Commit**

```bash
git add backend/apps/inventory/models/inbound.py \
        backend/apps/inventory/models/__init__.py \
        backend/apps/inventory/migrations/0006_inbound_transaction.py
git commit -m "feat: add InboundTransaction + InboundTransactionItem models"
```

---

### Task 2: Write failing tests

**Files:**
- Create: `backend/apps/inventory/tests/test_inbound.py`

This task writes ALL tests BEFORE any service or view code exists. Every test must fail with `ImportError` or `AttributeError` at this point — that proves they are actually testing new code.

- [ ] **Step 1: Create the test file**

Create `backend/apps/inventory/tests/test_inbound.py`:

```python
"""
Tests for POST /api/v1/inventory/inbound/

Feature: inventory_inbound_receiving
Permission: IsManagerOrAbove (owner or manager)
Tenant guard: SHOP businesses only
Idempotency: duplicate reference per tenant → 400
"""
import uuid
from decimal import Decimal
from datetime import date, timedelta

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.inventory.models import (
    InboundTransaction,
    InboundTransactionItem,
    StockMovement,
    StockLevel,
    MovementType,
    ProductBatch,
)
from apps.products.models import Product
from apps.subscriptions.models import Plan
from apps.tenants.models import Business, BusinessType, Shop


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_plan(name="Business", with_feature=True):
    features = {"inventory_inbound_receiving": True} if with_feature else {}
    return Plan.objects.create(
        name=name,
        price="0",
        currency="SDG",
        features=features,
        is_free=True,
    )


def make_owner(phone="+249912100001"):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Owner", role="owner"
    )


def make_business(owner, plan, business_type=BusinessType.SHOP, name="Shop Biz"):
    b = Business.objects.create(
        name=name,
        owner=owner,
        business_type=business_type,
        subscription_plan=plan,
    )
    owner.business = b
    owner.save(update_fields=["business", "updated_at"])
    return b


def make_shop(business, name="Main Shop"):
    return Shop.objects.create(name=name, business=business)


def make_product(tenant, name="Milk", track_inventory=True):
    return Product.objects.create(
        tenant=tenant, name=name, price="1.00", track_inventory=track_inventory
    )


def make_manager(business, phone="+249912100002"):
    u = CustomUser.objects.create_user(
        phone=phone, full_name="Manager", role="manager"
    )
    u.business = business
    u.save(update_fields=["business", "updated_at"])
    return u


def make_cashier(business, phone="+249912100003"):
    u = CustomUser.objects.create_user(
        phone=phone, full_name="Cashier", role="cashier"
    )
    u.business = business
    u.save(update_fields=["business", "updated_at"])
    return u


INBOUND_URL = "/api/v1/inventory/inbound/"


# ── Service-layer tests ────────────────────────────────────────────────────────

class InboundReceiveServiceTest(TestCase):
    def setUp(self):
        self.plan = make_plan()
        self.owner = make_owner()
        self.business = make_business(self.owner, self.plan)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business)

    def test_creates_transaction_and_items(self):
        from apps.inventory.services import inbound_receive

        txn = inbound_receive(
            tenant=self.business,
            shop=self.shop,
            reference="PO-001",
            items=[{"product": self.product, "quantity": Decimal("10")}],
            created_by=self.owner,
        )

        self.assertIsInstance(txn, InboundTransaction)
        self.assertEqual(txn.tenant, self.business)
        self.assertEqual(txn.shop, self.shop)
        self.assertEqual(txn.reference, "PO-001")
        self.assertEqual(txn.items.count(), 1)

    def test_increments_stock_level(self):
        from apps.inventory.services import inbound_receive

        inbound_receive(
            tenant=self.business,
            shop=self.shop,
            reference="PO-002",
            items=[{"product": self.product, "quantity": Decimal("5")}],
            created_by=self.owner,
        )

        level = StockLevel.objects.get(product=self.product, shop=self.shop)
        self.assertEqual(level.quantity, Decimal("5"))

    def test_creates_stock_movement_type_in(self):
        from apps.inventory.services import inbound_receive

        inbound_receive(
            tenant=self.business,
            shop=self.shop,
            reference="PO-003",
            items=[{"product": self.product, "quantity": Decimal("3")}],
            created_by=self.owner,
        )

        movement = StockMovement.objects.filter(product=self.product).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.movement_type, MovementType.IN)
        self.assertEqual(movement.quantity, Decimal("3"))

    def test_creates_product_batch_when_expiry_provided(self):
        from apps.inventory.services import inbound_receive

        expiry = date.today() + timedelta(days=30)
        inbound_receive(
            tenant=self.business,
            shop=self.shop,
            reference="PO-004",
            items=[{
                "product": self.product,
                "quantity": Decimal("4"),
                "expiry_date": expiry,
                "batch_number": "BATCH-A",
            }],
            created_by=self.owner,
        )

        batch = ProductBatch.objects.get(product=self.product, shop=self.shop)
        self.assertEqual(batch.expiry_date, expiry)
        self.assertEqual(batch.batch_number, "BATCH-A")
        self.assertEqual(batch.quantity, Decimal("4"))

    def test_no_product_batch_when_no_expiry(self):
        from apps.inventory.services import inbound_receive

        inbound_receive(
            tenant=self.business,
            shop=self.shop,
            reference="PO-005",
            items=[{"product": self.product, "quantity": Decimal("2")}],
            created_by=self.owner,
        )

        self.assertFalse(ProductBatch.objects.filter(product=self.product).exists())

    def test_duplicate_reference_raises_value_error(self):
        from apps.inventory.services import inbound_receive

        inbound_receive(
            tenant=self.business,
            shop=self.shop,
            reference="PO-DUP",
            items=[{"product": self.product, "quantity": Decimal("1")}],
            created_by=self.owner,
        )

        with self.assertRaises(ValueError):
            inbound_receive(
                tenant=self.business,
                shop=self.shop,
                reference="PO-DUP",
                items=[{"product": self.product, "quantity": Decimal("1")}],
                created_by=self.owner,
            )

    def test_multi_item_transaction(self):
        from apps.inventory.services import inbound_receive

        product2 = make_product(self.business, name="Sugar")
        txn = inbound_receive(
            tenant=self.business,
            shop=self.shop,
            reference="PO-MULTI",
            items=[
                {"product": self.product, "quantity": Decimal("10")},
                {"product": product2, "quantity": Decimal("20")},
            ],
            created_by=self.owner,
        )

        self.assertEqual(txn.items.count(), 2)
        self.assertEqual(StockMovement.objects.filter(shop=self.shop).count(), 2)


# ── API tests ─────────────────────────────────────────────────────────────────

class InboundReceiveAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.plan = make_plan(with_feature=True)
        self.owner = make_owner()
        self.business = make_business(self.owner, self.plan)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business)
        self.client.force_authenticate(user=self.owner)

    def _payload(self, reference="PO-API-001", extra_items=None):
        items = [{"product_id": str(self.product.id), "quantity": "5.000"}]
        if extra_items:
            items.extend(extra_items)
        return {"shop_id": str(self.shop.id), "reference": reference, "items": items}

    def test_owner_can_post(self):
        resp = self.client.post(INBOUND_URL, self._payload(), format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data["success"])

    def test_manager_can_post(self):
        manager = make_manager(self.business, phone="+249912100010")
        self.client.force_authenticate(user=manager)
        resp = self.client.post(INBOUND_URL, self._payload("PO-MGR-001"), format="json")
        self.assertEqual(resp.status_code, 201)

    def test_cashier_cannot_post(self):
        cashier = make_cashier(self.business, phone="+249912100011")
        self.client.force_authenticate(user=cashier)
        resp = self.client.post(INBOUND_URL, self._payload("PO-CSH-001"), format="json")
        self.assertEqual(resp.status_code, 403)

    def test_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post(INBOUND_URL, self._payload(), format="json")
        self.assertEqual(resp.status_code, 401)

    def test_feature_not_in_plan_returns_422(self):
        plan_no_feature = make_plan(name="Starter", with_feature=False)
        self.business.subscription_plan = plan_no_feature
        self.business.save(update_fields=["subscription_plan"])
        resp = self.client.post(INBOUND_URL, self._payload(), format="json")
        self.assertEqual(resp.status_code, 422)
        self.assertFalse(resp.data["success"])

    def test_restaurant_business_returns_400(self):
        plan = make_plan(name="RestoPlan", with_feature=True)
        owner2 = make_owner(phone="+249912100020")
        resto = make_business(owner2, plan, business_type=BusinessType.RESTAURANT, name="Resto")
        shop2 = make_shop(resto, name="Resto Shop")
        product2 = make_product(resto, name="Burger")
        self.client.force_authenticate(user=owner2)
        payload = {
            "shop_id": str(shop2.id),
            "reference": "PO-RESTO-001",
            "items": [{"product_id": str(product2.id), "quantity": "3.000"}],
        }
        resp = self.client.post(INBOUND_URL, payload, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_duplicate_reference_returns_400(self):
        self.client.post(INBOUND_URL, self._payload("PO-DUP-API"), format="json")
        resp = self.client.post(INBOUND_URL, self._payload("PO-DUP-API"), format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.data["success"])

    def test_response_shape(self):
        resp = self.client.post(INBOUND_URL, self._payload("PO-SHAPE"), format="json")
        self.assertEqual(resp.status_code, 201)
        data = resp.data["data"]
        self.assertIn("id", data)
        self.assertIn("reference", data)
        self.assertIn("item_count", data)
        self.assertIn("items", data)

    def test_stock_incremented_after_api_call(self):
        self.client.post(INBOUND_URL, self._payload("PO-STOCK"), format="json")
        level = StockLevel.objects.get(product=self.product, shop=self.shop)
        self.assertEqual(level.quantity, Decimal("5"))

    def test_empty_items_returns_400(self):
        payload = {"shop_id": str(self.shop.id), "reference": "PO-EMPTY", "items": []}
        resp = self.client.post(INBOUND_URL, payload, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_invalid_product_returns_400(self):
        payload = {
            "shop_id": str(self.shop.id),
            "reference": "PO-BADPROD",
            "items": [{"product_id": str(uuid.uuid4()), "quantity": "5.000"}],
        }
        resp = self.client.post(INBOUND_URL, payload, format="json")
        self.assertEqual(resp.status_code, 400)
```

- [ ] **Step 2: Run the tests to confirm they all fail**

```bash
cd backend
python manage.py test apps.inventory.tests.test_inbound --verbosity=2 2>&1 | head -40
```

Expected: `ImportError: cannot import name 'inbound_receive' from 'apps.inventory.services'` or similar — all tests fail. This confirms they are testing code that does not yet exist.

- [ ] **Step 3: Commit the failing tests**

```bash
git add backend/apps/inventory/tests/test_inbound.py
git commit -m "test: add failing tests for inventory inbound receiving (TDD)"
```

---

### Task 3: Service layer — `inbound_receive()`

**Files:**
- Modify: `backend/apps/inventory/services.py` (append after `transfer_stock`)

- [ ] **Step 1: Add `inbound_receive()` to services.py**

Append this function after `transfer_stock` in `backend/apps/inventory/services.py`:

```python
def inbound_receive(
    tenant,
    shop: Shop,
    reference: str,
    items: list[dict],
    created_by=None,
    notes: str = "",
):
    """
    Record a supplier stock delivery as a single auditable transaction.

    Args:
        tenant:     Business instance (the tenant).
        shop:       Shop instance where stock arrives.
        reference:  External reference (e.g. PO number). Must be unique per tenant.
        items:      List of dicts with keys:
                      - product (Product instance, required)
                      - quantity (Decimal/int/float, required, > 0)
                      - unit_cost (Decimal, optional)
                      - expiry_date (date, optional)
                      - batch_number (str, optional)
        created_by: User performing the action.
        notes:      Optional free-text notes on the header.

    Returns:
        The created InboundTransaction instance.

    Raises:
        ValueError: If reference already exists for this tenant.
    """
    from .models import InboundTransaction, InboundTransactionItem, ProductBatch

    if InboundTransaction.objects.filter(tenant=tenant, reference=reference).exists():
        raise ValueError(f"Inbound reference '{reference}' already exists for this tenant.")

    with transaction.atomic():
        txn = InboundTransaction.objects.create(
            tenant=tenant,
            shop=shop,
            reference=reference,
            notes=notes,
            created_by=created_by,
        )

        for item in items:
            product = item["product"]
            quantity = Decimal(str(item["quantity"]))
            unit_cost = item.get("unit_cost")
            expiry_date = item.get("expiry_date")
            batch_number = item.get("batch_number", "")

            InboundTransactionItem.objects.create(
                transaction=txn,
                product=product,
                quantity=quantity,
                unit_cost=unit_cost,
                expiry_date=expiry_date,
                batch_number=batch_number,
            )

            add_stock(
                product=product,
                shop=shop,
                quantity=quantity,
                reference=reference,
                notes=notes,
                created_by=created_by,
                movement_type=MovementType.IN,
            )

            if expiry_date:
                ProductBatch.objects.create(
                    product=product,
                    shop=shop,
                    quantity=quantity,
                    expiry_date=expiry_date,
                    batch_number=batch_number,
                    notes=notes,
                )

    logger.info(
        "Inbound transaction: ref=%s tenant=%s shop=%s items=%d",
        reference, tenant.id, shop.id, len(items),
    )
    return txn
```

Also add `InboundTransaction` to the import at line 13 in services.py (the lazy import inside the function avoids the circular import).

- [ ] **Step 2: Run the service tests only**

```bash
cd backend
python manage.py test apps.inventory.tests.test_inbound.InboundReceiveServiceTest --verbosity=2
```

Expected: all 7 service tests PASS. API tests still fail (no view/URL yet).

- [ ] **Step 3: Commit**

```bash
git add backend/apps/inventory/services.py
git commit -m "feat: add inbound_receive() service for stock delivery recording"
```

---

### Task 4: Serializers + View + URL

**Files:**
- Modify: `backend/apps/inventory/serializers.py` (append)
- Modify: `backend/apps/inventory/views.py` (append)
- Modify: `backend/apps/inventory/urls.py`

- [ ] **Step 1: Add serializers**

Append to the end of `backend/apps/inventory/serializers.py`:

```python
from .models import InboundTransaction, InboundTransactionItem


class InboundItemInputSerializer(serializers.Serializer):
    product_id   = serializers.UUIDField()
    quantity     = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"))
    unit_cost    = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    expiry_date  = serializers.DateField(required=False, allow_null=True)
    batch_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")

    def validate_expiry_date(self, value):
        from datetime import date
        if value and value < date.today():
            raise serializers.ValidationError("Expiry date must be today or in the future.")
        return value


class InboundReceiveSerializer(serializers.Serializer):
    shop_id   = serializers.UUIDField()
    reference = serializers.CharField(max_length=255)
    notes     = serializers.CharField(required=False, allow_blank=True, default="")
    items     = InboundItemInputSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value


class InboundTransactionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model  = InboundTransactionItem
        fields = ["id", "product", "product_name", "quantity", "unit_cost", "expiry_date", "batch_number"]


class InboundTransactionSerializer(serializers.ModelSerializer):
    items      = InboundTransactionItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)
    shop_name  = serializers.CharField(source="shop.name", read_only=True)

    class Meta:
        model  = InboundTransaction
        fields = ["id", "reference", "notes", "shop", "shop_name", "item_count", "items", "created_at"]
```

- [ ] **Step 2: Add the view**

Append to the end of `backend/apps/inventory/views.py`:

```python
from apps.core.permissions import IsManagerOrAbove
from apps.subscriptions.guards import require_feature
from .models import InboundTransaction, InboundTransactionItem
from .serializers import InboundReceiveSerializer, InboundTransactionSerializer
from .services import inbound_receive


class InboundReceiveView(APIView):
    """
    POST /api/v1/inventory/inbound/

    Record a supplier stock delivery. Requires the
    inventory_inbound_receiving feature on the active plan.
    Available for SHOP businesses only.
    Owner and manager roles only.
    """
    permission_classes = [IsAuthenticated, IsManagerOrAbove]

    def post(self, request):
        tenant = get_tenant_from_request(request)
        if not tenant:
            return Response(
                {"success": False, "message": "No active business found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if tenant.business_type == BusinessType.RESTAURANT:
            return Response(
                {"success": False, "message": "Inventory management is not available for restaurant businesses."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        require_feature(tenant, "inventory_inbound_receiving", "Inbound Stock Receiving")

        serializer = InboundReceiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            shop = Shop.objects.get(pk=data["shop_id"], business=tenant)
        except Shop.DoesNotExist:
            raise NotFound("Shop not found.")

        # Resolve product instances, enforcing tenant isolation
        resolved_items = []
        for item in data["items"]:
            try:
                product = Product.objects.get(pk=item["product_id"], tenant=tenant)
            except Product.DoesNotExist:
                return Response(
                    {"success": False, "message": f"Product {item['product_id']} not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            resolved_items.append({
                "product":      product,
                "quantity":     item["quantity"],
                "unit_cost":    item.get("unit_cost"),
                "expiry_date":  item.get("expiry_date"),
                "batch_number": item.get("batch_number", ""),
            })

        try:
            txn = inbound_receive(
                tenant=tenant,
                shop=shop,
                reference=data["reference"],
                items=resolved_items,
                created_by=request.user,
                notes=data.get("notes", ""),
            )
        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"success": True, "data": InboundTransactionSerializer(txn).data},
            status=status.HTTP_201_CREATED,
        )
```

- [ ] **Step 3: Register the URL**

Edit `backend/apps/inventory/urls.py` — add `inbound/` before the closing bracket:

```python
from django.urls import path
from . import views

app_name = "inventory"

urlpatterns = [
    path("stock/",             views.StockLevelListView.as_view(),    name="stock_list"),
    path("movements/",         views.StockMovementListView.as_view(), name="movement_list"),
    path("stock/add/",         views.StockAddView.as_view(),          name="stock_add"),
    path("stock/adjust/",      views.StockAdjustView.as_view(),       name="stock_adjust"),
    path("stock/transfer/",    views.StockTransferView.as_view(),     name="stock_transfer"),
    path("batches/",           views.BatchListView.as_view(),         name="batch_list"),
    path("batches/<uuid:pk>/", views.BatchDetailView.as_view(),       name="batch_detail"),
    path("expiry-alerts/",     views.ExpiryAlertsView.as_view(),      name="expiry_alerts"),
    path("inbound/",           views.InboundReceiveView.as_view(),    name="inbound_receive"),
]
```

- [ ] **Step 4: Run all inbound tests**

```bash
cd backend
python manage.py test apps.inventory.tests.test_inbound --verbosity=2
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full inventory test suite to check for regressions**

```bash
cd backend
python manage.py test apps.inventory --verbosity=2
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/inventory/serializers.py \
        backend/apps/inventory/views.py \
        backend/apps/inventory/urls.py
git commit -m "feat: add InboundReceiveView and serializers for POST /api/v1/inventory/inbound/"
```

---

### Task 5: Expose `enabled_features` in profile endpoint

The mobile app needs to know which features are available before rendering UI. Add `enabled_features` (a dict) to the profile response.

**Files:**
- Modify: `backend/apps/accounts/serializers.py`
- Create: `backend/apps/accounts/tests/test_profile_features.py`

- [ ] **Step 1: Write the failing test**

Create `backend/apps/accounts/tests/test_profile_features.py`:

```python
"""
Tests: enabled_features field in GET /api/v1/auth/profile/
"""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.subscriptions.models import Plan
from apps.tenants.models import Business, BusinessType, Shop


PROFILE_URL = "/api/v1/auth/profile/"


def make_plan(features=None):
    return Plan.objects.create(
        name="TestPlan",
        price="0",
        currency="SDG",
        features=features or {},
        is_free=True,
    )


def make_owner(phone="+249912200001"):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Owner", role="owner"
    )


def make_business(owner, plan):
    b = Business.objects.create(
        name="Test Biz",
        owner=owner,
        business_type=BusinessType.SHOP,
        subscription_plan=plan,
    )
    owner.business = b
    owner.save(update_fields=["business", "updated_at"])
    return b


class ProfileFeaturesTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_enabled_features_present_in_profile(self):
        plan = make_plan(features={"inventory_inbound_receiving": True})
        owner = make_owner()
        make_business(owner, plan)
        self.client.force_authenticate(user=owner)

        resp = self.client.get(PROFILE_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertIn("enabled_features", resp.data["data"])
        self.assertTrue(resp.data["data"]["enabled_features"]["inventory_inbound_receiving"])

    def test_enabled_features_empty_for_no_plan(self):
        owner = make_owner(phone="+249912200002")
        b = Business.objects.create(name="NoPlanBiz", owner=owner, business_type=BusinessType.SHOP)
        owner.business = b
        owner.save(update_fields=["business", "updated_at"])
        self.client.force_authenticate(user=owner)

        resp = self.client.get(PROFILE_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["data"]["enabled_features"], {})

    def test_enabled_features_false_feature_not_included(self):
        plan = make_plan(features={"inventory_inbound_receiving": False})
        owner = make_owner(phone="+249912200003")
        make_business(owner, plan)
        self.client.force_authenticate(user=owner)

        resp = self.client.get(PROFILE_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["data"]["enabled_features"].get("inventory_inbound_receiving", True))
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend
python manage.py test apps.accounts.tests.test_profile_features --verbosity=2
```

Expected: FAIL — `enabled_features` key not in response.

- [ ] **Step 3: Add `enabled_features` to `UserProfileSerializer`**

In `backend/apps/accounts/serializers.py`, locate `class UserProfileSerializer` (line 122) and:

1. Add `enabled_features = serializers.SerializerMethodField()` after the `bankak_account_number` field declaration.
2. Add `"enabled_features"` to the `fields` list.
3. Add the `get_enabled_features` method.

The resulting class should look like this (show full class for clarity):

```python
class UserProfileSerializer(serializers.ModelSerializer):
    """Read/Update serializer for user profile."""
    bankak_account = serializers.SerializerMethodField()
    bankak_account_number = serializers.CharField(
        max_length=50, required=False, allow_blank=True, write_only=True
    )
    enabled_features = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "phone",
            "email",
            "full_name",
            "role",
            "is_staff",
            "is_verified",
            "has_password",
            "business_id",
            "default_shop_id",
            "bankak_account",
            "bankak_account_number",
            "enabled_features",
            "created_at",
            "last_login_at",
        ]
        read_only_fields = [
            "id",
            "phone",
            "role",
            "is_staff",
            "is_verified",
            "has_password",
            "business_id",
            "default_shop_id",
            "created_at",
            "last_login_at",
        ]

    def get_enabled_features(self, obj) -> dict:
        business = obj.business
        if not business or not business.subscription_plan_id:
            return {}
        plan = business.subscription_plan
        return {k: bool(v) for k, v in (plan.features or {}).items()}

    # ... existing get_bankak_account, validate_*, update methods unchanged ...
```

**Important:** Only add the new field and method. Do NOT remove or change any existing method.

- [ ] **Step 4: Run profile tests**

```bash
cd backend
python manage.py test apps.accounts.tests.test_profile_features --verbosity=2
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Run the full accounts test suite to check for regressions**

```bash
cd backend
python manage.py test apps.accounts --verbosity=2
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/accounts/serializers.py \
        backend/apps/accounts/tests/test_profile_features.py
git commit -m "feat: expose enabled_features in user profile endpoint"
```

---

### Task 6: Full test run + verify

- [ ] **Step 1: Run all tests**

```bash
cd backend
python manage.py test --verbosity=2 2>&1 | tail -20
```

Expected: all tests PASS, zero failures.

- [ ] **Step 2: Verify the endpoint manually with curl (optional smoke test)**

```bash
# Get a token first via your local dev server, then:
curl -X POST http://localhost:8000/api/v1/inventory/inbound/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "shop_id": "<shop_uuid>",
    "reference": "PO-SMOKE-001",
    "items": [
      {"product_id": "<product_uuid>", "quantity": "10.000"}
    ]
  }'
```

Expected: HTTP 201 with `{"success": true, "data": {"id": "...", "reference": "PO-SMOKE-001", ...}}`

- [ ] **Step 3: Commit if any cleanups**

```bash
git status
# commit any loose files if needed
```

---

## Self-Review

### 1. Spec Coverage

| Requirement | Implemented in |
|---|---|
| Premium feature flag `inventory_inbound_receiving` | Task 4 — `require_feature()` guard in view |
| `InboundTransaction` + `InboundTransactionItem` models | Task 1 |
| Idempotency — duplicate reference rejection | Task 3 service + Task 2 test `test_duplicate_reference_*` |
| Role enforcement (owner/manager only) | Task 4 — `IsManagerOrAbove` permission |
| Stock level increment via `add_stock()` | Task 3 service |
| `StockMovement` with type "in" | Task 3 service + Task 2 test |
| `ProductBatch` creation when expiry provided | Task 3 service + Task 2 test |
| Reject restaurant businesses | Task 4 view + Task 2 test |
| Expose feature flags to mobile | Task 5 — `enabled_features` in profile |
| POST /api/v1/inventory/inbound/ URL | Task 4 — urls.py |
| Multi-item transaction | Task 2 test + Task 3 service |

### 2. Placeholder Scan

No TBD, TODO, or incomplete sections found.

### 3. Type Consistency

- `inbound_receive()` in Task 3 accepts `items: list[dict]` with `product` as a Product *instance*.
- Task 4 view resolves UUIDs to Product instances before calling `inbound_receive()`. ✅
- `InboundTransactionSerializer` references `InboundTransactionItem` which is defined in Task 1. ✅
- `require_feature(tenant, "inventory_inbound_receiving", ...)` matches the signature in `guards.py:122`. ✅
- `get_enabled_features` reads `business.subscription_plan.features` (JSONField on `Plan`). The plan is already eagerly loaded via `subscription_plan_id` check. ✅
