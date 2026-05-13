from rest_framework import serializers
from .models import NotificationTemplate, NotificationSetting, NotificationDelivery


class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NotificationTemplate
        fields = [
            "id", "key", "name", "category", "channel",
            "title_en", "body_en", "title_ar", "body_ar",
            "variables", "is_enabled", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class NotificationTemplateWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NotificationTemplate
        fields = [
            "key", "name", "category", "channel",
            "title_en", "body_en", "title_ar", "body_ar",
            "variables", "is_enabled",
        ]

    def validate_key(self, value: str) -> str:
        import re
        if not re.match(r'^[a-z][a-z0-9_]{1,98}[a-z0-9]$', value):
            raise serializers.ValidationError(
                "Key must be lowercase letters, digits, underscores; 3–100 chars."
            )
        return value

    def validate_variables(self, value) -> list:
        if not isinstance(value, list):
            raise serializers.ValidationError("variables must be a list of strings.")
        if not all(isinstance(v, str) for v in value):
            raise serializers.ValidationError("Each variable must be a string.")
        return value


class NotificationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model  = NotificationSetting
        fields = ["key", "value", "description", "updated_at"]
        read_only_fields = ["key", "description", "updated_at"]


class ManualPushSerializer(serializers.Serializer):
    user_id     = serializers.UUIDField()
    title       = serializers.CharField(max_length=255, required=False, allow_blank=True)
    body        = serializers.CharField(required=False, allow_blank=True)
    template_id = serializers.UUIDField(required=False, allow_null=True)
    variables   = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False, default=dict)

    def validate(self, attrs):
        has_custom   = attrs.get("title") and attrs.get("body")
        has_template = attrs.get("template_id")
        if not has_custom and not has_template:
            raise serializers.ValidationError(
                "Provide either (title + body) or template_id."
            )
        return attrs


class ManualSMSSerializer(serializers.Serializer):
    user_id     = serializers.UUIDField()
    message     = serializers.CharField(required=False, allow_blank=True)
    template_id = serializers.UUIDField(required=False, allow_null=True)
    variables   = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False, default=dict)

    def validate(self, attrs):
        if not attrs.get("message") and not attrs.get("template_id"):
            raise serializers.ValidationError(
                "Provide either message or template_id."
            )
        return attrs


class DeliveryLogSerializer(serializers.ModelSerializer):
    recipient_name     = serializers.SerializerMethodField()
    recipient_phone    = serializers.SerializerMethodField()
    notification_title = serializers.SerializerMethodField()
    sent_by_admin_name = serializers.SerializerMethodField()

    class Meta:
        model  = NotificationDelivery
        fields = [
            "id", "channel", "status",
            "recipient_name", "recipient_phone",
            "notification_title",
            "sent_by_admin_name",
            "retry_count", "provider_message_id", "error_message",
            "sent_at", "failed_at", "created_at",
        ]

    def get_recipient_name(self, obj):
        return obj.recipient.full_name or obj.recipient.phone

    def get_recipient_phone(self, obj):
        return obj.recipient.phone

    def get_notification_title(self, obj):
        return obj.notification.title if obj.notification else obj.payload.get("title", "")

    def get_sent_by_admin_name(self, obj):
        if obj.sent_by_admin:
            return obj.sent_by_admin.full_name or obj.sent_by_admin.phone
        return None
