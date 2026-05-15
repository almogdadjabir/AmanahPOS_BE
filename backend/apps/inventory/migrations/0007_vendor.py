import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0006_inbound_transaction"),
        ("tenants",   "0007_inbound_transaction"),
    ]

    operations = [
        migrations.CreateModel(
            name="Vendor",
            fields=[
                ("id",         models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name",       models.CharField(max_length=255)),
                ("phone",      models.CharField(blank=True, max_length=50)),
                ("email",      models.EmailField(blank=True)),
                ("address",    models.TextField(blank=True)),
                ("notes",      models.TextField(blank=True)),
                ("is_active",  models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "tenant",
                    models.ForeignKey(
                        db_index=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="vendors",
                        to="tenants.business",
                    ),
                ),
            ],
            options={
                "verbose_name":        "Vendor",
                "verbose_name_plural": "Vendors",
                "db_table":            "inventory_vendors",
                "ordering":            ["name"],
            },
        ),
        migrations.AddConstraint(
            model_name="vendor",
            constraint=models.UniqueConstraint(
                fields=["tenant", "name"],
                name="unique_vendor_name_per_tenant",
            ),
        ),
        migrations.AddIndex(
            model_name="vendor",
            index=models.Index(
                fields=["tenant", "is_active"],
                name="inv_vendor_tenant_active_idx",
            ),
        ),
    ]
