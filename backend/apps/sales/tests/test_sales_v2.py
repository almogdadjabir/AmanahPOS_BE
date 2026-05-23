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
            "payment_method": "credit",
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
        resp = self.client.get("/api/v1/sales/?payment_method=credit")
        self.assertEqual(resp.status_code, 200)
        for sale in resp.data["results"]:
            self.assertEqual(sale["payment_method"], "credit")


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


# ─── Task 4: refund endpoint ──────────────────────────────────────────────────

class TestProcessRefund(TestCase):
    def setUp(self):
        self.owner = make_owner("+249900000004")
        self.business = make_business(self.owner)
        self.shop = make_shop(self.business)
        self.product = make_product(self.business, price="600.00", track_inventory=True)
        seed_stock(self.product, self.shop, qty=10)
        self.client = make_auth_client(self.owner)

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
        with self.assertRaises(BusinessLogicError):
            process_refund(
                sale=self.sale,
                items=[{"product_id": str(self.product.id), "quantity": Decimal("1")}],
                notes="",
                refunded_by=self.owner,
            )

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

    def test_cannot_over_refund_across_partial_refunds(self):
        from apps.sales.services import process_refund
        from apps.core.exceptions import BusinessLogicError
        # First partial refund: return 2 of 3
        process_refund(
            sale=self.sale,
            items=[{"product_id": str(self.product.id), "quantity": Decimal("2")}],
            notes="First partial",
            refunded_by=self.owner,
        )
        self.sale.refresh_from_db()
        # Second refund: try to return 2 more, but only 1 remains
        with self.assertRaises(BusinessLogicError) as ctx:
            process_refund(
                sale=self.sale,
                items=[{"product_id": str(self.product.id), "quantity": Decimal("2")}],
                notes="Over-refund attempt",
                refunded_by=self.owner,
            )
        self.assertEqual(ctx.exception.detail.code, "QUANTITY_EXCEEDED")


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

    def test_refund_cancelled_sale_returns_error(self):
        sale = Sale.objects.get(pk=self.sale_id)
        sale.status = SaleStatus.CANCELLED
        sale.save()
        resp = self.client.post(self._refund_url(), {
            "items": [{"product_id": str(self.product.id), "quantity": "1"}],
        }, format="json")
        self.assertFalse(resp.data["success"])
        self.assertIn(resp.status_code, [400, 422])

    def test_refund_unknown_product_returns_error(self):
        resp = self.client.post(self._refund_url(), {
            "items": [{"product_id": str(uuid.uuid4()), "quantity": "1"}],
        }, format="json")
        self.assertIn(resp.status_code, [400, 422])

    def test_refund_excess_quantity_returns_error(self):
        resp = self.client.post(self._refund_url(), {
            "items": [{"product_id": str(self.product.id), "quantity": "99"}],
        }, format="json")
        self.assertIn(resp.status_code, [400, 422])

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


class TestSalesSummaryRefundFields(TestCase):
    """GET /api/v1/sales/summary/ must include refund_count and total_refunds."""

    def setUp(self):
        self.owner   = make_owner("+249900000099")
        self.biz     = make_business(self.owner)
        self.shop    = make_shop(self.biz)
        self.product = make_product(self.biz)
        seed_stock(self.product, self.shop, qty=20)
        self.client  = make_auth_client(self.owner)

    def _direct_sale(self, status="completed"):
        sale = Sale.objects.create(
            tenant=self.biz,
            shop=self.shop,
            cashier=self.owner,
            receipt_number=f"REC-{uuid.uuid4().hex[:8]}",
            total_amount="600.00",
            net_amount="600.00",
            discount_amount="0",
            tax_amount="0",
            payment_method="cash",
            status=status,
        )
        SaleItem.objects.create(
            sale=sale,
            product=self.product,
            quantity="1",
            unit_price="600.00",
            discount="0",
            subtotal="600.00",
        )
        return sale

    def test_refund_fields_present_with_zero_refunds(self):
        self._direct_sale(SaleStatus.COMPLETED)
        resp = self.client.get("/api/v1/sales/summary/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertIn("refund_count",  data)
        self.assertIn("total_refunds", data)
        self.assertEqual(data["refund_count"], 0)
        self.assertEqual(data["total_refunds"], "0")

    def test_refund_fields_count_refunded_and_partial(self):
        self._direct_sale(SaleStatus.COMPLETED)
        self._direct_sale(SaleStatus.REFUNDED)
        self._direct_sale(SaleStatus.PARTIAL_REFUND)
        resp = self.client.get("/api/v1/sales/summary/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertEqual(data["refund_count"], 2)
        self.assertAlmostEqual(float(data["total_refunds"]), 1200.0, places=1)
