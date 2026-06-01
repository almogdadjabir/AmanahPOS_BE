# Sale Receipts, Transaction History & Returns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `?search=` to the sale list, `receipt_number` to offline sync results, and a new `POST /api/v1/sales/{id}/refund/` endpoint that processes full or partial customer returns with stock restoration.

**Architecture:** All changes are in `backend/apps/sales/`. Tasks 1–3 are small surgical edits to existing files. Task 4 adds a `process_refund()` service function and a `SaleRefundView` view class. Refund history is tracked via markers appended to `sale.notes` (no new model needed). Each change is independently committable.

**Tech Stack:** Django 5.0.6, DRF 3.15.2, PostgreSQL, `django.db.transaction.atomic`, existing `add_stock()` from `apps.inventory.services`.

---

## File Map

| File | Change |
|---|---|
| `backend/apps/sales/serializers.py` | Add `RefundItemSerializer`, `RefundRequestSerializer` |
| `backend/apps/sales/services.py` | Add `process_refund()` |
| `backend/apps/sales/views.py` | Add `?search=` + `?payment_method=` to list; add `receipt_number` to offline sync result; add `SaleRefundView` |
| `backend/apps/sales/urls.py` | Add `<uuid:pk>/refund/` route |
| `backend/apps/sales/tests/test_sales_v2.py` | New test file covering all 4 tasks |

---

## Task 1: Verify `receipt_number` in sale create response

**Files:**
- Verify: `backend/apps/sales/serializers.py:37-48`

`receipt_number` is already in `SaleSerializer.Meta.fields`. This task confirms it and adds a regression test so it can never silently disappear.

- [ ] **Step 1: Write the failing test**

Create `backend/apps/sales/tests/test_sales_v2.py`:

```python
"""
Tests: sale receipts, transaction history search, offline sync receipt_number, returns.
"""
import uuid
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.tenants.models import Business, Shop
from apps.products.models import Product, Category
from apps.inventory.models import StockLevel
from apps.sales.models import Sale, SaleItem, SaleStatus


# ─── Helpers ─────────────────────────────────────────────────────────────────

def make_owner(phone="+249900000001"):
    return CustomUser.objects.create_user(
        phone=phone, full_name="Owner", role="owner", is_active=True,
    )


def make_business(owner):
    return Business.objects.create(
        owner=owner, name="Test Biz", slug=f"test-biz-{uuid.uuid4().hex[:6]}",
        business_type="shop",
    )


def make_shop(business):
    return Shop.objects.create(business=business, name="Main Shop", is_main=True, is_active=True)


def make_category(business):
    return Category.objects.create(tenant=business, name="Drinks", is_active=True)


def make_product(business, price="600.00", track_inventory=True):
    return Product.objects.create(
        tenant=business, name="Pepsi 500ml", sku=f"SKU-{uuid.uuid4().hex[:6]}",
        price=Decimal(price), track_inventory=track_inventory, is_active=True,
        category=make_category(business),
    )


def seed_stock(product, shop, qty=10):
    StockLevel.objects.create(product=product, shop=shop, quantity=qty)


def make_auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def create_sale_via_api(client, shop, product, qty=2):
    return client.post("/api/v1/sales/", {
        "shop": str(shop.id),
        "items": [{"product_id": str(product.id), "quantity": str(qty)}],
        "payment_method": "cash",
    }, format="json")


# ─── Task 1: receipt_number in sale create response ───────────────────────────

class TestSaleCreateReceiptNumber(TestCase):
    def setUp(self):
        self.owner = make_owner()
        self.business = make_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business)
        seed_stock(self.product, self.shop, 10)
        self.client = make_auth_client(self.owner)

    def test_receipt_number_in_create_response(self):
        """POST /api/v1/sales/ response must include receipt_number."""
        resp = create_sale_via_api(self.client, self.shop, self.product)
        self.assertEqual(resp.status_code, 201)
        self.assertIn("receipt_number", resp.data["data"])
        self.assertIsNotNone(resp.data["data"]["receipt_number"])
```

- [ ] **Step 2: Run test to confirm it passes (it should — field already exists)**

```bash
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/sales/tests/test_sales_v2.py::TestSaleCreateReceiptNumber -v --no-migrations
```

Expected: PASS. If it fails, `receipt_number` was removed — check `SaleSerializer.Meta.fields`.

- [ ] **Step 3: Commit**

```bash
git add backend/apps/sales/tests/test_sales_v2.py
git commit -m "test: add regression test for receipt_number in sale create response"
```

---

## Task 2: Add `?search=` and `?payment_method=` to sale list

**Files:**
- Modify: `backend/apps/sales/views.py:41-75`
- Test: `backend/apps/sales/tests/test_sales_v2.py`

The Flutter app sends `?search=RECEIPT-123` or `?search=Ali` to filter transaction history. Currently only individual `receipt` / `status` / `cashier` / `date_from` / `date_to` params exist. Add unified `search` (searches receipt_number, customer name/phone) and `payment_method` filter.

- [ ] **Step 1: Write the failing tests**

Append to `test_sales_v2.py`:

```python
# ─── Task 2: sale list search ─────────────────────────────────────────────────

class TestSaleListSearch(TestCase):
    def setUp(self):
        from apps.customers.models import Customer
        self.owner = make_owner("+249900000002")
        self.business = make_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business)
        seed_stock(self.product, self.shop, 50)
        self.client = make_auth_client(self.owner)
        self.customer = Customer.objects.create(
            tenant=self.business, name="Ali Mohamed", phone="+249911111111"
        )
        # Create 2 sales: one with customer, one without
        resp1 = self.client.post("/api/v1/sales/", {
            "shop": str(self.shop.id),
            "items": [{"product_id": str(self.product.id), "quantity": "1"}],
            "payment_method": "cash",
            "customer": str(self.customer.id),
        }, format="json")
        self.sale1_receipt = resp1.data["data"]["receipt_number"]

        resp2 = self.client.post("/api/v1/sales/", {
            "shop": str(self.shop.id),
            "items": [{"product_id": str(self.product.id), "quantity": "1"}],
            "payment_method": "bankak",
        }, format="json")
        self.sale2_receipt = resp2.data["data"]["receipt_number"]

    def test_search_by_receipt_number(self):
        resp = self.client.get(f"/api/v1/sales/?search={self.sale1_receipt}")
        self.assertEqual(resp.status_code, 200)
        receipts = [s["receipt_number"] for s in resp.data["results"]]
        self.assertIn(self.sale1_receipt, receipts)

    def test_search_by_customer_name(self):
        resp = self.client.get("/api/v1/sales/?search=Ali")
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.data["results"]), 1)
        receipts = [s["receipt_number"] for s in resp.data["results"]]
        self.assertIn(self.sale1_receipt, receipts)
        self.assertNotIn(self.sale2_receipt, receipts)

    def test_filter_by_payment_method(self):
        resp = self.client.get("/api/v1/sales/?payment_method=bankak")
        self.assertEqual(resp.status_code, 200)
        for sale in resp.data["results"]:
            self.assertEqual(sale["payment_method"], "bankak")
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/sales/tests/test_sales_v2.py::TestSaleListSearch -v --no-migrations
```

Expected: FAIL — `?search=` returns all sales (no filtering).

- [ ] **Step 3: Implement search and payment_method filter in SaleListCreateView**

In `backend/apps/sales/views.py`, inside `SaleListCreateView.get()`, add after the existing `date_to` filter block (around line 69):

```python
        # Search across receipt_number, customer name, customer phone
        search_q = request.query_params.get("search")
        if search_q:
            from django.db.models import Q
            qs = qs.filter(
                Q(receipt_number__icontains=search_q) |
                Q(customer__name__icontains=search_q) |
                Q(customer__phone__icontains=search_q)
            )

        payment_method = request.query_params.get("payment_method")
        if payment_method:
            qs = qs.filter(payment_method=payment_method)
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/sales/tests/test_sales_v2.py::TestSaleListSearch -v --no-migrations
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/apps/sales/views.py backend/apps/sales/tests/test_sales_v2.py
git commit -m "feat: add ?search= and ?payment_method= filters to sale list"
```

---

## Task 3: Add `receipt_number` to offline sync response

**Files:**
- Modify: `backend/apps/sales/views.py` — `_sync_one_sale()` function (~lines 297–370)
- Test: `backend/apps/sales/tests/test_sales_v2.py`

Currently `_sync_one_sale` returns `{"client_sale_id", "status", "server_sale_id", "message"}`. The spec requires `receipt_number` in every result item.

- [ ] **Step 1: Write the failing test**

Append to `test_sales_v2.py`:

```python
# ─── Task 3: offline sync receipt_number ─────────────────────────────────────

class TestOfflineSyncReceiptNumber(TestCase):
    def setUp(self):
        self.owner = make_owner("+249900000003")
        self.business = make_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business)
        seed_stock(self.product, self.shop, 50)
        self.client = make_auth_client(self.owner)

    def test_offline_sync_result_includes_receipt_number(self):
        payload = {"sales": [{
            "client_sale_id": str(uuid.uuid4()),
            "shop": str(self.shop.id),
            "items": [{"product_id": str(self.product.id), "quantity": "1"}],
            "payment_method": "cash",
        }]}
        resp = self.client.post("/api/v1/sales/offline-sync/", payload, format="json")
        self.assertEqual(resp.status_code, 200)
        result = resp.data["results"][0]
        self.assertEqual(result["status"], "synced")
        self.assertIn("receipt_number", result)
        self.assertIsNotNone(result["receipt_number"])

    def test_idempotent_sync_also_includes_receipt_number(self):
        client_id = str(uuid.uuid4())
        payload = {"sales": [{
            "client_sale_id": client_id,
            "shop": str(self.shop.id),
            "items": [{"product_id": str(self.product.id), "quantity": "1"}],
            "payment_method": "cash",
        }]}
        # First sync
        self.client.post("/api/v1/sales/offline-sync/", payload, format="json")
        # Second sync (idempotent)
        resp = self.client.post("/api/v1/sales/offline-sync/", payload, format="json")
        result = resp.data["results"][0]
        self.assertEqual(result["status"], "synced")
        self.assertIn("receipt_number", result)
        self.assertIsNotNone(result["receipt_number"])
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/sales/tests/test_sales_v2.py::TestOfflineSyncReceiptNumber -v --no-migrations
```

Expected: FAIL — `receipt_number` key missing from result dict.

- [ ] **Step 3: Add receipt_number to _sync_one_sale results**

In `backend/apps/sales/views.py`, update `_sync_one_sale` in two places:

**Idempotent path** (around line 309):
```python
    if existing:
        return {
            "client_sale_id": client_sale_id,
            "status": "synced",
            "server_sale_id": str(existing.id),
            "receipt_number": existing.receipt_number,
            "message": "Already synced.",
        }
```

**Success path** (around line 357):
```python
        return {
            "client_sale_id": client_sale_id,
            "status": "synced",
            "server_sale_id": str(sale.id),
            "receipt_number": sale.receipt_number,
            "message": None,
        }
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/sales/tests/test_sales_v2.py::TestOfflineSyncReceiptNumber -v --no-migrations
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/apps/sales/views.py backend/apps/sales/tests/test_sales_v2.py
git commit -m "feat: include receipt_number in offline sync response results"
```

---

## Task 4: Implement the refund endpoint

**Files:**
- Modify: `backend/apps/sales/serializers.py` — add `RefundItemSerializer`, `RefundRequestSerializer`
- Modify: `backend/apps/sales/services.py` — add `process_refund()`
- Modify: `backend/apps/sales/views.py` — add `SaleRefundView`
- Modify: `backend/apps/sales/urls.py` — add route
- Test: `backend/apps/sales/tests/test_sales_v2.py`

### Sub-task 4a — Serializers

- [ ] **Step 1: Add serializers**

Append to `backend/apps/sales/serializers.py`:

```python
class RefundItemSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"))


class RefundRequestSerializer(serializers.Serializer):
    items = RefundItemSerializer(many=True, min_length=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
```

- [ ] **Step 2: Commit serializers**

```bash
git add backend/apps/sales/serializers.py
git commit -m "feat: add RefundItemSerializer and RefundRequestSerializer"
```

### Sub-task 4b — Service

- [ ] **Step 3: Write failing tests for the service**

Append to `test_sales_v2.py`:

```python
# ─── Task 4: refund endpoint ──────────────────────────────────────────────────

class TestProcessRefund(TestCase):
    def setUp(self):
        self.owner = make_owner("+249900000004")
        self.business = make_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business, price="600.00", track_inventory=True)
        seed_stock(self.product, self.shop, qty=10)
        self.client = make_auth_client(self.owner)

        # Create a sale with 3 units
        resp = create_sale_via_api(self.client, self.shop, self.product, qty=3)
        self.sale_id = resp.data["data"]["id"]
        self.receipt_number = resp.data["data"]["receipt_number"]
        self.sale = Sale.objects.get(pk=self.sale_id)

    def test_full_refund_sets_status_refunded(self):
        from apps.sales.services import process_refund
        result = process_refund(
            sale=self.sale,
            items=[{"product_id": str(self.product.id), "quantity": Decimal("3")}],
            notes="Full return",
            refunded_by=self.owner,
        )
        self.sale.refresh_from_db()
        self.assertEqual(self.sale.status, SaleStatus.REFUNDED)
        self.assertIn("-R1", result["refund_reference"])

    def test_partial_refund_sets_status_partial_refund(self):
        from apps.sales.services import process_refund
        result = process_refund(
            sale=self.sale,
            items=[{"product_id": str(self.product.id), "quantity": Decimal("1")}],
            notes="Partial",
            refunded_by=self.owner,
        )
        self.sale.refresh_from_db()
        self.assertEqual(self.sale.status, SaleStatus.PARTIAL_REFUND)
        self.assertIn("-R1", result["refund_reference"])

    def test_second_refund_uses_r2(self):
        from apps.sales.services import process_refund
        process_refund(
            sale=self.sale,
            items=[{"product_id": str(self.product.id), "quantity": Decimal("1")}],
            notes="First partial",
            refunded_by=self.owner,
        )
        self.sale.refresh_from_db()
        result2 = process_refund(
            sale=self.sale,
            items=[{"product_id": str(self.product.id), "quantity": Decimal("1")}],
            notes="Second partial",
            refunded_by=self.owner,
        )
        self.assertIn("-R2", result2["refund_reference"])

    def test_refund_restores_stock(self):
        from apps.sales.services import process_refund
        stock_before = StockLevel.objects.get(product=self.product, shop=self.shop).quantity
        process_refund(
            sale=self.sale,
            items=[{"product_id": str(self.product.id), "quantity": Decimal("2")}],
            notes="Return",
            refunded_by=self.owner,
        )
        stock_after = StockLevel.objects.get(product=self.product, shop=self.shop).quantity
        self.assertEqual(stock_after, stock_before + Decimal("2"))

    def test_cannot_refund_cancelled_sale(self):
        from apps.sales.services import process_refund
        from apps.core.exceptions import BusinessLogicError
        self.sale.status = SaleStatus.CANCELLED
        self.sale.save()
        with self.assertRaises(BusinessLogicError) as ctx:
            process_refund(
                sale=self.sale,
                items=[{"product_id": str(self.product.id), "quantity": Decimal("1")}],
                notes="",
                refunded_by=self.owner,
            )
        self.assertIn("cancelled", str(ctx.exception.detail).lower())

    def test_cannot_refund_already_refunded_sale(self):
        from apps.sales.services import process_refund
        from apps.core.exceptions import BusinessLogicError
        self.sale.status = SaleStatus.REFUNDED
        self.sale.save()
        with self.assertRaises(BusinessLogicError):
            process_refund(
                sale=self.sale,
                items=[{"product_id": str(self.product.id), "quantity": Decimal("1")}],
                notes="",
                refunded_by=self.owner,
            )

    def test_unknown_product_raises_error(self):
        from apps.sales.services import process_refund
        from apps.core.exceptions import BusinessLogicError
        with self.assertRaises(BusinessLogicError):
            process_refund(
                sale=self.sale,
                items=[{"product_id": str(uuid.uuid4()), "quantity": Decimal("1")}],
                notes="",
                refunded_by=self.owner,
            )

    def test_quantity_exceeds_original_raises_error(self):
        from apps.sales.services import process_refund
        from apps.core.exceptions import BusinessLogicError
        with self.assertRaises(BusinessLogicError):
            process_refund(
                sale=self.sale,
                items=[{"product_id": str(self.product.id), "quantity": Decimal("99")}],
                notes="",
                refunded_by=self.owner,
            )

    def test_returned_items_in_result(self):
        from apps.sales.services import process_refund
        result = process_refund(
            sale=self.sale,
            items=[{"product_id": str(self.product.id), "quantity": Decimal("2")}],
            notes="",
            refunded_by=self.owner,
        )
        self.assertEqual(len(result["returned_items"]), 1)
        item = result["returned_items"][0]
        self.assertEqual(item["product_id"], str(self.product.id))
        self.assertEqual(item["product_name"], self.product.name)
        self.assertEqual(item["quantity"], Decimal("2"))
        self.assertIn("unit_price", item)
        self.assertIn("subtotal", item)
```

- [ ] **Step 4: Run tests to confirm they fail**

```bash
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/sales/tests/test_sales_v2.py::TestProcessRefund -v --no-migrations
```

Expected: FAIL — `process_refund` does not exist.

- [ ] **Step 5: Implement `process_refund()` in services.py**

Append to `backend/apps/sales/services.py`:

```python
@transaction.atomic
def process_refund(sale: Sale, items: list[dict], notes: str = "", refunded_by=None) -> dict:
    """
    Process a full or partial customer return.

    Args:
        sale: The Sale being refunded.
        items: List of dicts [{product_id: str, quantity: Decimal}]
        notes: Optional reason / cashier note.
        refunded_by: User performing the refund.

    Returns:
        dict with keys: refund_reference, refund_total, returned_items, sale

    Raises:
        BusinessLogicError: sale already cancelled/refunded, unknown product,
                            or quantity exceeds original.
    """
    if sale.status in (SaleStatus.CANCELLED, SaleStatus.REFUNDED):
        raise BusinessLogicError(
            f"Cannot refund a sale with status '{sale.status}'.",
            code="INVALID_SALE_STATUS",
        )

    # Build a lookup of product_id → SaleItem for this sale
    sale_items_map: dict[str, SaleItem] = {
        str(si.product_id): si
        for si in sale.items.select_related("product").all()
    }

    # Validate all requested items
    for item_data in items:
        pid = str(item_data["product_id"])
        if pid not in sale_items_map:
            raise BusinessLogicError(
                f"Product {pid} was not part of sale {sale.receipt_number}.",
                code="PRODUCT_NOT_IN_SALE",
            )
        original_qty = sale_items_map[pid].quantity
        if Decimal(str(item_data["quantity"])) > original_qty:
            raise BusinessLogicError(
                f"Return quantity {item_data['quantity']} exceeds original quantity "
                f"{original_qty} for product {pid}.",
                code="QUANTITY_EXCEEDED",
            )

    # Determine refund number (count prior [REFUND] markers in notes)
    prior_refunds = sale.notes.count("[REFUND]")
    refund_n = prior_refunds + 1
    refund_reference = f"{sale.receipt_number}-R{refund_n}"

    is_restaurant = sale.tenant.business_type == BusinessType.RESTAURANT

    refund_total = Decimal("0")
    returned_items = []

    for item_data in items:
        pid = str(item_data["product_id"])
        original_item = sale_items_map[pid]
        qty = Decimal(str(item_data["quantity"]))
        subtotal = original_item.unit_price * qty

        refund_total += subtotal
        returned_items.append({
            "product_id": pid,
            "product_name": original_item.product.name,
            "quantity": qty,
            "unit_price": original_item.unit_price,
            "subtotal": subtotal,
        })

        # Restore stock
        if not is_restaurant:
            has_stock_record = StockLevel.objects.filter(
                product=original_item.product, shop=sale.shop
            ).exists()
            if original_item.product.track_inventory or has_stock_record:
                add_stock(
                    product=original_item.product,
                    shop=sale.shop,
                    quantity=qty,
                    reference=refund_reference,
                    notes=f"Return for {refund_reference}: {notes}",
                    created_by=refunded_by,
                    movement_type=MovementType.RETURN,
                )

    # Determine new sale status
    total_sold = sum(si.quantity for si in sale_items_map.values())
    total_returned = sum(Decimal(str(i["quantity"])) for i in items)
    new_status = (
        SaleStatus.REFUNDED if total_returned >= total_sold
        else SaleStatus.PARTIAL_REFUND
    )

    # Append refund marker to notes and update status
    refund_note = f"[REFUND] {refund_reference}: {notes}".strip()
    sale.notes = f"{sale.notes}\n{refund_note}".strip()
    sale.status = new_status
    sale.save(update_fields=["status", "notes", "updated_at"])

    logger.info(
        "Refund processed: %s | sale=%s | total=%s",
        refund_reference, sale.receipt_number, refund_total,
    )
    return {
        "refund_reference": refund_reference,
        "refund_total": refund_total,
        "returned_items": returned_items,
        "sale": sale,
    }
```

- [ ] **Step 6: Run service tests to confirm they pass**

```bash
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/sales/tests/test_sales_v2.py::TestProcessRefund -v --no-migrations
```

Expected: PASS (9 tests).

- [ ] **Step 7: Commit service**

```bash
git add backend/apps/sales/services.py backend/apps/sales/tests/test_sales_v2.py
git commit -m "feat: add process_refund() service — partial/full returns with stock restoration"
```

### Sub-task 4c — View + URL

- [ ] **Step 8: Write failing API tests**

Append to `test_sales_v2.py`:

```python
class TestRefundView(TestCase):
    def setUp(self):
        self.owner = make_owner("+249900000005")
        self.business = make_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business, price="600.00", track_inventory=True)
        seed_stock(self.product, self.shop, qty=10)
        self.client = make_auth_client(self.owner)

        resp = create_sale_via_api(self.client, self.shop, self.product, qty=3)
        self.sale_id = resp.data["data"]["id"]
        self.receipt_number = resp.data["data"]["receipt_number"]

    def _refund_url(self):
        return f"/api/v1/sales/{self.sale_id}/refund/"

    def test_full_refund_returns_200_with_correct_shape(self):
        resp = self.client.post(self._refund_url(), {
            "items": [{"product_id": str(self.product.id), "quantity": "3"}],
            "notes": "Customer changed mind",
        }, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["success"])
        self.assertIn("refund_reference", resp.data)
        self.assertIn("refund_total", resp.data)
        self.assertIn("returned_items", resp.data)
        self.assertIn("sale", resp.data)
        self.assertIn("-R1", resp.data["refund_reference"])

    def test_refund_sale_object_has_updated_status(self):
        resp = self.client.post(self._refund_url(), {
            "items": [{"product_id": str(self.product.id), "quantity": "3"}],
        }, format="json")
        self.assertEqual(resp.data["sale"]["status"], "refunded")

    def test_partial_refund_response(self):
        resp = self.client.post(self._refund_url(), {
            "items": [{"product_id": str(self.product.id), "quantity": "1"}],
        }, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["sale"]["status"], "partial_refund")

    def test_refund_cancelled_sale_returns_422(self):
        sale = Sale.objects.get(pk=self.sale_id)
        sale.status = SaleStatus.CANCELLED
        sale.save()
        resp = self.client.post(self._refund_url(), {
            "items": [{"product_id": str(self.product.id), "quantity": "1"}],
        }, format="json")
        self.assertEqual(resp.status_code, 422)
        self.assertFalse(resp.data["success"])

    def test_refund_unknown_product_returns_422(self):
        resp = self.client.post(self._refund_url(), {
            "items": [{"product_id": str(uuid.uuid4()), "quantity": "1"}],
        }, format="json")
        self.assertEqual(resp.status_code, 422)

    def test_refund_excess_quantity_returns_422(self):
        resp = self.client.post(self._refund_url(), {
            "items": [{"product_id": str(self.product.id), "quantity": "99"}],
        }, format="json")
        self.assertEqual(resp.status_code, 422)

    def test_returned_items_shape(self):
        resp = self.client.post(self._refund_url(), {
            "items": [{"product_id": str(self.product.id), "quantity": "2"}],
        }, format="json")
        item = resp.data["returned_items"][0]
        self.assertEqual(item["product_id"], str(self.product.id))
        self.assertIn("product_name", item)
        self.assertIn("quantity", item)
        self.assertIn("unit_price", item)
        self.assertIn("subtotal", item)
```

- [ ] **Step 9: Run tests to confirm they fail**

```bash
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/sales/tests/test_sales_v2.py::TestRefundView -v --no-migrations
```

Expected: FAIL — 404 (route doesn't exist yet).

- [ ] **Step 10: Check what HTTP status code BusinessLogicError returns**

```bash
cd backend && grep -n "INVALID_SALE_STATUS\|status_code\|HTTP_422" apps/core/exceptions.py | head -20
```

`BusinessLogicError` returns HTTP 422 by default in this codebase (check `apps/core/exceptions.py`). If it returns 400, update the test assertions for the error cases to use 400 instead of 422. Match whatever the existing `cancel_sale` error tests use.

- [ ] **Step 11: Add SaleRefundView to views.py**

In `backend/apps/sales/views.py`, add this import at the top with the other serializer imports:

```python
from .serializers import (
    CancelSaleSerializer,
    CreateSaleSerializer,
    OfflineSyncRequestSerializer,
    RefundRequestSerializer,
    SaleSerializer,
)
```

And add this import with services:
```python
from .services import cancel_sale, create_sale, process_refund
```

Then append the view class:

```python
class SaleRefundView(APIView):
    """
    POST /api/v1/sales/<id>/refund/
    Process a full or partial customer return.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        tenant = get_tenant_from_request(request)
        if not tenant:
            raise BusinessLogicError("No active business found.")

        try:
            sale = Sale.objects.select_related(
                "tenant", "shop"
            ).prefetch_related("items__product").get(pk=pk, tenant=tenant)
        except Sale.DoesNotExist:
            raise NotFound("Sale not found.")

        serializer = RefundRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        result = process_refund(
            sale=sale,
            items=data["items"],
            notes=data.get("notes", ""),
            refunded_by=request.user,
        )

        sale_data = Sale.objects.select_related(
            "shop", "cashier", "customer"
        ).prefetch_related("items__product").get(pk=sale.pk)

        return Response({
            "success": True,
            "refund_reference": result["refund_reference"],
            "refund_total": str(result["refund_total"]),
            "returned_items": [
                {
                    "product_id": item["product_id"],
                    "product_name": item["product_name"],
                    "quantity": str(item["quantity"]),
                    "unit_price": str(item["unit_price"]),
                    "subtotal": str(item["subtotal"]),
                }
                for item in result["returned_items"]
            ],
            "sale": SaleSerializer(sale_data).data,
        })
```

- [ ] **Step 12: Add URL route**

In `backend/apps/sales/urls.py`, add:

```python
path("<uuid:pk>/refund/", views.SaleRefundView.as_view(), name="sale_refund"),
```

Full `urlpatterns` after the change:

```python
urlpatterns = [
    path("", views.SaleListCreateView.as_view(), name="sale_list_create"),
    path("summary/", views.SalesSummaryView.as_view(), name="sale_summary"),
    path("dashboard-summary/", views.DashboardSummaryView.as_view(), name="dashboard_summary"),
    path("offline-sync/", views.OfflineSyncView.as_view(), name="sale_offline_sync"),
    path("<uuid:pk>/", views.SaleDetailView.as_view(), name="sale_detail"),
    path("<uuid:pk>/cancel/", views.SaleCancelView.as_view(), name="sale_cancel"),
    path("<uuid:pk>/refund/", views.SaleRefundView.as_view(), name="sale_refund"),
]
```

- [ ] **Step 13: Run all view tests**

```bash
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/sales/tests/test_sales_v2.py::TestRefundView -v --no-migrations
```

Expected: PASS (7 tests).

- [ ] **Step 14: Run full test file to confirm no regressions**

```bash
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest \
  apps/sales/tests/test_sales_v2.py -v --no-migrations
```

Expected: All tests PASS.

- [ ] **Step 15: Commit view + URL**

```bash
git add backend/apps/sales/views.py backend/apps/sales/urls.py \
        backend/apps/sales/serializers.py backend/apps/sales/tests/test_sales_v2.py
git commit -m "feat: add POST /api/v1/sales/{id}/refund/ endpoint"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| `receipt_number` in sale create response | Task 1 — already present, regression test added |
| `?search=` on sale list (receipt, customer name, phone) | Task 2 |
| `?payment_method=` filter on sale list | Task 2 |
| `receipt_number` in offline sync response | Task 3 |
| `POST /api/v1/sales/{id}/refund/` endpoint | Task 4 |
| Validate sale not cancelled/refunded → 422 | Task 4b service + 4c view |
| Validate product in original sale → 422 | Task 4b service |
| Validate quantity ≤ original → 422 | Task 4b service |
| Full refund → status `refunded` | Task 4b service |
| Partial refund → status `partial_refund` | Task 4b service |
| Stock restoration for tracked products | Task 4b service |
| `refund_reference` = `{receipt}-R{n}` | Task 4b service |
| Correct response shape with `returned_items` | Task 4c view |
| Atomic transaction | Task 4b — `@transaction.atomic` decorator |

**No placeholders found.**

**Type consistency:** `process_refund()` defined in Task 4b and called in Task 4c with identical signature `(sale, items, notes, refunded_by)`. `returned_items` dict keys match between service return and view serialization.
