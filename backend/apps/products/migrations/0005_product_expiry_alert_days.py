from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0004_image_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="expiry_alert_days",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
