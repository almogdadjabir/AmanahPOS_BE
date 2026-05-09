from rest_framework import serializers
from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    actor_name  = serializers.SerializerMethodField()
    actor_phone = serializers.SerializerMethodField()
    action_label = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            "id", "action", "action_label",
            "entity_type", "entity_id", "entity_label",
            "description", "metadata",
            "actor_id", "actor_name", "actor_phone",
            "ip_address", "created_at",
        ]

    def get_actor_name(self, obj):
        return obj.actor.full_name if obj.actor else None

    def get_actor_phone(self, obj):
        return obj.actor.phone if obj.actor else None

    def get_action_label(self, obj):
        return obj.get_action_display()
