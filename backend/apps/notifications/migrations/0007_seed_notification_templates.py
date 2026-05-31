from django.db import migrations
import uuid


TEMPLATES = [
    {
        "key":       "welcome",
        "name":      "Welcome",
        "category":  "success",
        "channel":   "push",
        "title_en":  "Welcome to AmanaPOS!",
        "body_en":   "Your account is ready. Start managing your business from anywhere.",
        "title_ar":  "مرحبًا بك في أمانة POS!",
        "body_ar":   "حسابك جاهز. ابدأ إدارة عملك من أي مكان.",
        "variables": [],
    },
    {
        "key":       "new_device_login",
        "name":      "New Device Login",
        "category":  "warning",
        "channel":   "push",
        "title_en":  "New device login",
        "body_en":   "Your account was just accessed from a new device: {device_name}. If this wasn't you, contact support immediately.",
        "title_ar":  "تسجيل دخول من جهاز جديد",
        "body_ar":   "تم الوصول إلى حسابك من جهاز جديد: {device_name}. إذا لم تكن أنت، تواصل مع الدعم فورًا.",
        "variables": ["device_name"],
    },
    {
        "key":       "low_stock",
        "name":      "Low Stock Alert",
        "category":  "stock",
        "channel":   "push",
        "title_en":  "Low Stock Alert",
        "body_en":   "'{product_name}' at {shop_name} is running low. Stock: {current_qty} (min: {min_qty})",
        "title_ar":  "تنبيه: مخزون منخفض",
        "body_ar":   "'{product_name}' في {shop_name} وصل إلى مستوى منخفض. الكمية: {current_qty} (الحد الأدنى: {min_qty})",
        "variables": ["product_name", "shop_name", "current_qty", "min_qty"],
    },
    {
        "key":       "product_expiring_soon",
        "name":      "Product Expiring Soon",
        "category":  "warning",
        "channel":   "push",
        "title_en":  "Product Expiring Soon",
        "body_en":   "'{product_name}' at {shop_name} will expire on {expiry_date}. Check your inventory to avoid waste.",
        "title_ar":  "منتج يقترب من انتهاء صلاحيته",
        "body_ar":   "'{product_name}' في {shop_name} ينتهي في {expiry_date}. راجع مخزونك لتجنب الهدر.",
        "variables": ["product_name", "shop_name", "expiry_date"],
    },
    {
        "key":       "product_expired",
        "name":      "Product Expired",
        "category":  "error",
        "channel":   "push",
        "title_en":  "Product Expired",
        "body_en":   "'{product_name}' at {shop_name} expired on {expiry_date}. Remove it from stock immediately.",
        "title_ar":  "منتج منتهي الصلاحية",
        "body_ar":   "'{product_name}' في {shop_name} انتهت صلاحيته في {expiry_date}. أزله من المخزون فورًا.",
        "variables": ["product_name", "shop_name", "expiry_date"],
    },
    {
        "key":       "subscription_expiry",
        "name":      "Subscription Expiring Soon",
        "category":  "subscription",
        "channel":   "push",
        "title_en":  "Subscription Expiring Soon",
        "body_en":   "Your {business_name} subscription expires in {days_remaining} day(s). Renew now to avoid interruption.",
        "title_ar":  "اشتراكك ينتهي قريبًا",
        "body_ar":   "اشتراك {business_name} ينتهي خلال {days_remaining} يوم. جدّد الآن لتجنب الانقطاع.",
        "variables": ["business_name", "days_remaining"],
    },
]


def seed_templates(apps, schema_editor):
    NotificationTemplate = apps.get_model("notifications", "NotificationTemplate")
    for t in TEMPLATES:
        NotificationTemplate.objects.get_or_create(
            key=t["key"],
            defaults={
                "id":         uuid.uuid4(),
                "name":       t["name"],
                "category":   t["category"],
                "channel":    t["channel"],
                "title_en":   t["title_en"],
                "body_en":    t["body_en"],
                "title_ar":   t["title_ar"],
                "body_ar":    t["body_ar"],
                "variables":  t["variables"],
                "is_enabled": True,
            },
        )


def unseed_templates(apps, schema_editor):
    NotificationTemplate = apps.get_model("notifications", "NotificationTemplate")
    keys = [t["key"] for t in TEMPLATES]
    NotificationTemplate.objects.filter(key__in=keys).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0006_notificationdelivery_next_retry_at"),
    ]
    operations = [
        migrations.RunPython(seed_templates, reverse_code=unseed_templates),
    ]
