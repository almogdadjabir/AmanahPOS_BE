import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0004_alter_stockmovement_quantity_and_more"),
        ("products", "0004_image_fields"),
        ("tenants", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductBatch",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("quantity", models.DecimalField(decimal_places=3, max_digits=12)),
                ("expiry_date", models.DateField(db_index=True)),
                ("batch_number", models.CharField(blank=True, max_length=100)),
                ("notes", models.TextField(blank=True)),
                ("last_notified_date", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("product", models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name="batches", to="products.product")),
                ("shop", models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name="product_batches", to="tenants.shop")),
            ],
            options={
                "verbose_name": "Product Batch",
                "verbose_name_plural": "Product Batches",
                "db_table": "inventory_product_batches",
                "ordering": ["expiry_date"],
            },
        ),
        migrations.AddIndex(
            model_name="productbatch",
            index=models.Index(fields=["product", "shop", "expiry_date"], name="inv_batch_prod_shop_exp_idx"),
        ),
        migrations.AddIndex(
            model_name="productbatch",
            index=models.Index(fields=["shop", "expiry_date"], name="inv_batch_shop_exp_idx"),
        ),
    ]
