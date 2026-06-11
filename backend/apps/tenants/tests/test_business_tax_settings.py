import uuid
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

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
