from rest_framework import serializers

from .models import DeviceToken, Notification, Platform


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "title", "body", "notification_type",
            "is_read", "data", "created_at",
        ]
        read_only_fields = fields


class UnreadCountSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField()


class DeviceRegisterSerializer(serializers.Serializer):
    token       = serializers.CharField(max_length=512)
    platform    = serializers.ChoiceField(choices=Platform.choices)
    device_id   = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    app_version = serializers.CharField(max_length=50,  required=False, allow_blank=True, default="")

    def validate_platform(self, value):
        if value not in Platform.values:
            raise serializers.ValidationError(f"Platform must be one of: {', '.join(Platform.values)}.")
        return value


class DeviceUnregisterSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=512)


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ["id", "platform", "device_id", "app_version", "is_active", "last_seen_at", "created_at"]
        read_only_fields = fields
