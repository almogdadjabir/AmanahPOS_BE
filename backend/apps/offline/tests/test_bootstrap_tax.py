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
