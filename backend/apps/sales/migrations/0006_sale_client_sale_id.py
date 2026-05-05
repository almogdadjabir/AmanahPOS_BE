from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0005_alter_sale_payment_method"),
    ]

    operations = [
        migrations.AddField(
            model_name="sale",
            name="client_sale_id",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Mobile-generated UUID for offline sale idempotency.",
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddConstraint(
            model_name="sale",
            constraint=models.UniqueConstraint(
                condition=models.Q(client_sale_id__isnull=False),
                fields=["tenant", "client_sale_id"],
                name="unique_tenant_client_sale_id",
            ),
        ),
    ]
