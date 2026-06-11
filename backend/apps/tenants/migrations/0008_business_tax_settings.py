from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0007_inbound_transaction"),
    ]

    operations = [
        migrations.AddField(
            model_name="business",
            name="tax_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="business",
            name="tax_name",
            field=models.CharField(default="VAT", max_length=50),
        ),
        migrations.AddField(
            model_name="business",
            name="tax_rate",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=5,
                validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("100"))],
            ),
        ),
        migrations.AddField(
            model_name="business",
            name="tax_inclusive",
            field=models.BooleanField(default=False),
        ),
    ]
