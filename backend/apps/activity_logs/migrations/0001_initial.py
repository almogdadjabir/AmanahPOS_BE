import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ActivityLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(
                    choices=[
                        ("owner_created",        "Owner Created"),
                        ("owner_updated",        "Owner Updated"),
                        ("owner_activated",      "Owner Activated"),
                        ("owner_deactivated",    "Owner Deactivated"),
                        ("business_created",     "Business Created"),
                        ("business_updated",     "Business Updated"),
                        ("business_activated",   "Business Activated"),
                        ("business_deactivated", "Business Deactivated"),
                        ("subscription_created",     "Subscription Created"),
                        ("subscription_updated",     "Subscription Updated"),
                        ("subscription_deactivated", "Subscription Deactivated"),
                        ("plan_created",     "Plan Created"),
                        ("plan_updated",     "Plan Updated"),
                        ("plan_activated",   "Plan Activated"),
                        ("plan_deactivated", "Plan Deactivated"),
                    ],
                    db_index=True,
                    max_length=50,
                )),
                ("entity_type",  models.CharField(db_index=True, max_length=50)),
                ("entity_id",    models.CharField(blank=True, db_index=True, max_length=100)),
                ("entity_label", models.CharField(blank=True, max_length=255)),
                ("description",  models.TextField(blank=True)),
                ("metadata",     models.JSONField(blank=True, default=dict)),
                ("ip_address",   models.GenericIPAddressField(blank=True, null=True)),
                ("created_at",   models.DateTimeField(auto_now_add=True, db_index=True)),
                ("actor", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="activity_logs",
                    to=settings.AUTH_USER_MODEL,
                    db_index=True,
                )),
            ],
            options={
                "verbose_name": "Activity Log",
                "verbose_name_plural": "Activity Logs",
                "db_table": "activity_logs",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["actor", "created_at"],     name="act_logs_actor_created_idx"),
                    models.Index(fields=["action", "created_at"],    name="act_logs_action_created_idx"),
                    models.Index(fields=["entity_type", "entity_id"], name="act_logs_entity_idx"),
                ],
            },
        ),
    ]
