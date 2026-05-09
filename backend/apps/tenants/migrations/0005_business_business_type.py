from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0004_alter_shop_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="business",
            name="business_type",
            field=models.CharField(
                choices=[("shop", "Shop"), ("restaurant", "Restaurant")],
                default="shop",
                db_index=True,
                max_length=20,
            ),
        ),
    ]
