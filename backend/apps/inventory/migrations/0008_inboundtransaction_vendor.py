import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0007_vendor"),
    ]

    operations = [
        migrations.AddField(
            model_name="inboundtransaction",
            name="vendor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="inbound_transactions",
                to="inventory.vendor",
            ),
        ),
        migrations.AddIndex(
            model_name="inboundtransaction",
            index=models.Index(
                fields=["vendor", "created_at"],
                name="inventory_inbound_vendor_created_idx",
            ),
        ),
    ]
