from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0006_sale_client_sale_id"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="sale",
            index=models.Index(
                fields=["tenant", "status", "created_at"],
                name="sale_tenant_status_creat_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="sale",
            index=models.Index(
                fields=["tenant", "shop", "status", "created_at"],
                name="sale_shop_status_creat_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="sale",
            index=models.Index(
                fields=["tenant", "cashier", "status", "created_at"],
                name="sale_cashier_status_idx",
            ),
        ),
    ]
