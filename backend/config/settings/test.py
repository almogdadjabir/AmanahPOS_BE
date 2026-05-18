"""
AmanaPOS Test Settings
======================
Uses SQLite and in-memory cache so tests run without Docker.
"""
from .base import *  # noqa: F401, F403
from .base import BASE_DIR

DEBUG = True
SECRET_KEY = "test-secret-key-not-for-production-use-only"
ALLOWED_HOSTS = ["*"]

DEV_OTP_CODE = ""  # Don't override OTP in tests — let them use real generation

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test_db.sqlite3",
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# No S3
USE_S3 = False
STORAGES = {
    "default":     {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
FIREBASE_ENABLED = False

OTP_PROVIDER                = "stub"
DEFAULT_OTP_CHANNEL         = "sms"
OTP_ALLOWED_CHANNELS        = ["sms", "whatsapp"]
OTP_MAX_ATTEMPTS            = 5
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_EXPIRY_SECONDS          = 300
OTP_LENGTH                  = 6
