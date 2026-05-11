# Generated migration for DeviceToken and NotificationDelivery models.

import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_alter_notification_data'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── DeviceToken ───────────────────────────────────────────────────────
        migrations.CreateModel(
            name='DeviceToken',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('token', models.CharField(max_length=512, unique=True)),
                ('platform', models.CharField(
                    choices=[('android', 'Android'), ('ios', 'iOS'), ('web', 'Web')],
                    db_index=True, max_length=10,
                )),
                ('device_id',   models.CharField(blank=True, max_length=255, null=True)),
                ('app_version', models.CharField(blank=True, max_length=50,  null=True)),
                ('is_active',   models.BooleanField(db_index=True, default=True)),
                ('last_seen_at', models.DateTimeField(blank=True, null=True)),
                ('created_at',  models.DateTimeField(auto_now_add=True)),
                ('updated_at',  models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    db_index=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='device_tokens',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Device Token',
                'verbose_name_plural': 'Device Tokens',
                'db_table': 'notifications_device_tokens',
            },
        ),
        migrations.AddIndex(
            model_name='devicetoken',
            index=models.Index(fields=['user', 'is_active'], name='notif_dt_user_active_idx'),
        ),

        # ── NotificationDelivery ──────────────────────────────────────────────
        migrations.CreateModel(
            name='NotificationDelivery',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('channel', models.CharField(
                    choices=[('push', 'Push'), ('sms', 'SMS'), ('email', 'Email')],
                    db_index=True, default='push', max_length=10,
                )),
                ('status', models.CharField(
                    choices=[
                        ('pending',    'Pending'),
                        ('processing', 'Processing'),
                        ('sent',       'Sent'),
                        ('failed',     'Failed'),
                        ('cancelled',  'Cancelled'),
                    ],
                    db_index=True, default='pending', max_length=20,
                )),
                ('retry_count',  models.PositiveSmallIntegerField(default=0)),
                ('max_retries',  models.PositiveSmallIntegerField(default=3)),
                ('scheduled_at', models.DateTimeField(blank=True, null=True)),
                ('sent_at',      models.DateTimeField(blank=True, null=True)),
                ('failed_at',    models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True)),
                ('provider_message_id', models.CharField(blank=True, max_length=255)),
                ('payload',     models.JSONField(default=dict)),
                ('created_at',  models.DateTimeField(auto_now_add=True)),
                ('updated_at',  models.DateTimeField(auto_now=True)),
                ('notification', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='deliveries',
                    to='notifications.notification',
                )),
                ('recipient', models.ForeignKey(
                    db_index=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notification_deliveries',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Notification Delivery',
                'verbose_name_plural': 'Notification Deliveries',
                'db_table': 'notifications_deliveries',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notificationdelivery',
            index=models.Index(fields=['recipient', 'status'], name='notif_del_recipient_status_idx'),
        ),
        migrations.AddIndex(
            model_name='notificationdelivery',
            index=models.Index(fields=['channel', 'status'], name='notif_del_channel_status_idx'),
        ),
        migrations.AddIndex(
            model_name='notificationdelivery',
            index=models.Index(fields=['status', 'created_at'], name='notif_del_status_created_idx'),
        ),
    ]
