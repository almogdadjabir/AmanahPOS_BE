import uuid
import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_customuser_accounts_user_is_staff_idx_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="BankakAccount",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("account_number", models.CharField(
                    max_length=50,
                    validators=[django.core.validators.RegexValidator(
                        regex=r'^[\w\s\-]{4,50}$',
                        message="Account number must be 4–50 characters (letters, digits, spaces, hyphens).",
                    )],
                )),
                ("is_default", models.BooleanField(default=True, db_index=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("owner", models.ForeignKey(
                    db_index=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="bankak_accounts",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "verbose_name": "Bankak Account",
                "verbose_name_plural": "Bankak Accounts",
                "db_table": "accounts_bankak_accounts",
                "ordering": ["-is_default", "-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="bankakaccount",
            index=models.Index(fields=["owner", "is_default"], name="bankak_owner_default_idx"),
        ),
        migrations.AddIndex(
            model_name="bankakaccount",
            index=models.Index(fields=["owner", "is_active"], name="bankak_owner_active_idx"),
        ),
    ]
