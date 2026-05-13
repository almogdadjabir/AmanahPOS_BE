from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0005_notificationdelivery_sent_by_admin"),
    ]

    operations = [
        migrations.AddField(
            model_name="notificationdelivery",
            name="next_retry_at",
            field=models.DateTimeField(blank=True, null=True, db_index=True),
        ),
        migrations.AddIndex(
            model_name="notificationdelivery",
            index=models.Index(fields=["status", "updated_at"], name="notif_del_status_updated_idx"),
        ),
        migrations.AddIndex(
            model_name="notificationdelivery",
            index=models.Index(fields=["status", "next_retry_at"], name="notif_del_status_retry_idx"),
        ),
    ]
