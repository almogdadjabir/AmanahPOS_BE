"""
AmanaPOS Local Development Settings
====================================
"""
from .base import *  # noqa: F401, F403
from .base import INSTALLED_APPS, MIDDLEWARE, CACHES

DEBUG = True
SECRET_KEY = "local-dev-secret-key-not-for-production-use-only"
ALLOWED_HOSTS = ["*"]

# All OTPs are this code in local dev — no SMS needed
DEV_OTP_CODE = "123456"

# ─── Local Database ───────────────────────────────────────────────────────────
# Uses the same DB settings from base.py / .env
# Override here if you want to use SQLite locally:
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.sqlite3",
#         "NAME": BASE_DIR / "db.sqlite3",
#     }
# }

# ─── Debug Toolbar ────────────────────────────────────────────────────────────
try:
    import debug_toolbar  # noqa
    INSTALLED_APPS = INSTALLED_APPS + ["debug_toolbar"]
    MIDDLEWARE = ["debug_toolbar.middleware.DebugToolbarMiddleware"] + MIDDLEWARE
    INTERNAL_IPS = ["127.0.0.1", "::1"]
    DEBUG_TOOLBAR_CONFIG = {
        "SHOW_TOOLBAR_CALLBACK": lambda request: DEBUG,
    }
except ImportError:
    pass

# ─── Django Extensions ────────────────────────────────────────────────────────
try:
    import django_extensions  # noqa
    if "django_extensions" not in INSTALLED_APPS:
        INSTALLED_APPS = INSTALLED_APPS + ["django_extensions"]
except ImportError:
    pass

# ─── Email (Console in local) ─────────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ─── Cache (use LocMemCache locally if Redis isn't available) ─────────────────
# Uncomment below to use local memory cache instead of Redis:
# CACHES = {
#     "default": {
#         "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
#     }
# }

# ─── CORS (allow all in local dev) ───────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True

# ─── Static / Media (local filesystem, no S3) ────────────────────────────────
USE_S3 = False
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# ─── DRF local overrides ─────────────────────────────────────────────────────
REST_FRAMEWORK_EXTRA = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}

# ─── Logging (verbose in local) ───────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] [{levelname}] [{name}:{lineno}] {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": "WARNING",  # Set to DEBUG to see SQL queries
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}
