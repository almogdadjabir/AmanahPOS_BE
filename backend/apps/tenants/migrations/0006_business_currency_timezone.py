from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0005_business_business_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="business",
            name="currency",
            field=models.CharField(default="SDG", max_length=10),
        ),
        migrations.AddField(
            model_name="business",
            name="timezone",
            field=models.CharField(default="Africa/Khartoum", max_length=60),
        ),
    ]
