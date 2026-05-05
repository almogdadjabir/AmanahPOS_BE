# Generated for AmanaPOS image upload support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0003_alter_product_barcode_alter_product_cost_price_and_more"),
    ]

    operations = [
        # Product: replace ImageField with CharField, add thumbnail
        migrations.AlterField(
            model_name="product",
            name="image",
            field=models.CharField(blank=True, default=None, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name="product",
            name="thumbnail",
            field=models.CharField(blank=True, default=None, max_length=500, null=True),
        ),
        # Category: same
        migrations.AlterField(
            model_name="category",
            name="image",
            field=models.CharField(blank=True, default=None, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name="category",
            name="thumbnail",
            field=models.CharField(blank=True, default=None, max_length=500, null=True),
        ),
    ]
