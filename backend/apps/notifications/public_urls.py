from django.urls import path
from .views import TestWhatsAppReplyView

app_name = "notifications_public"

urlpatterns = [
    # TEMPORARY — remove after WhatsApp delivery testing
    path("test-whatsapp-reply/", TestWhatsAppReplyView.as_view(), name="test_whatsapp_reply"),
]
