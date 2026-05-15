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
