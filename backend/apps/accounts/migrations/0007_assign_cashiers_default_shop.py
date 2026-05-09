"""
Data migration: for any business that has exactly one active shop, assign
that shop as default_shop for all cashiers/managers who currently have none.

Zero-downtime: purely additive — only sets NULL → shop_id, never clears.
"""
from django.db import migrations


def assign_default_shop(apps, schema_editor):
    CustomUser = apps.get_model("accounts", "CustomUser")
    Shop = apps.get_model("tenants", "Shop")

    for shop in Shop.objects.filter(is_active=True):
        business = shop.business
        # Only auto-assign when the business has exactly one active shop
        if Shop.objects.filter(business=business, is_active=True).count() != 1:
            continue

        CustomUser.objects.filter(
            business=business,
            role__in=["cashier", "manager"],
            default_shop__isnull=True,
        ).update(default_shop=shop)


def reverse_assign(apps, schema_editor):
    # Irreversible in production — we don't know which assignments were manual
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0006_bankakaccount"),
        ("tenants", "0005_business_business_type"),
    ]

    operations = [
        migrations.RunPython(assign_default_shop, reverse_assign),
    ]
