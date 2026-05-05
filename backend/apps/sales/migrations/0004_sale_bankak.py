from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0003_alter_sale_net_amount_alter_sale_synced_at_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="sale",
            name="bankak_account_snapshot",
            field=models.CharField(blank=True, max_length=50, default=""),
            preserve_default=False,
        ),
    ]
