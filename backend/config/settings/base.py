"""
AmanaPOS Base Settings
======================
All settings common to every environment.
"""
from datetime import timedelta
from pathlib import Path

import environ

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/

# ─── Environment ──────────────────────────────────────────────────────────────
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    USE_S3=(bool, True),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:3000"]),
    OTP_LENGTH=(int, 6),
    OTP_EXPIRY_SECONDS=(int, 300),
    OTP_PROVIDER=(str, "stub"),
    DEFAULT_OTP_CHANNEL=(str, "sms"),
    OTP_ALLOWED_CHANNELS=(list, ["sms", "whatsapp"]),
    OTP_MAX_ATTEMPTS=(int, 5),
    OTP_RESEND_COOLDOWN_SECONDS=(int, 60),
    JWT_ACCESS_TOKEN_LIFETIME_MINUTES=(int, 60),
    JWT_REFRESH_TOKEN_LIFETIME_DAYS=(int, 30),
    GUNICORN_WORKERS=(int, 4),
)

environ.Env.read_env(BASE_DIR.parent / ".env")

# ─── Core ─────────────────────────────────────────────────────────────────────
SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")
APP_NAME = env("APP_NAME", default="AmanaPOS")
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")

# ─── Application Definition ───────────────────────────────────────────────────
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "drf_spectacular",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "django_celery_beat",
    "django_celery_results",
    "storages",
]

LOCAL_APPS = [
    "apps.core.apps.CoreConfig",
    "apps.accounts.apps.AccountsConfig",
    "apps.tenants.apps.TenantsConfig",
    "apps.products.apps.ProductsConfig",
    "apps.inventory.apps.InventoryConfig",
    "apps.sales.apps.SalesConfig",
    "apps.customers.apps.CustomersConfig",
    "apps.subscriptions.apps.SubscriptionsConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.audit_logs.apps.AuditLogsConfig",
    "apps.activity_logs.apps.ActivityLogsConfig",
    "apps.admin_panel.apps.AdminPanelConfig",
    "apps.offline.apps.OfflineConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ─── Middleware ───────────────────────────────────────────────────────────────
MIDDLEWARE = [
    "apps.core.middleware.JsonErrorMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.audit_logs.middleware.AuditLogMiddleware",
]

APPEND_SLASH = False

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ─── Templates ────────────────────────────────────────────────────────────────
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ─── Database ─────────────────────────────────────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME", default="amanapos"),
        "USER": env("DB_USER", default="amanapos"),
        "PASSWORD": env("DB_PASSWORD", default="amanapos_secret"),
        "HOST": env("DB_HOST", default="postgres"),
        "PORT": env("DB_PORT", default="5432"),
        "CONN_MAX_AGE": 60,
        "OPTIONS": {
            "connect_timeout": 10,
            "options": "-c search_path=public",
        },
    }
}

# ─── Custom User Model ────────────────────────────────────────────────────────
AUTH_USER_MODEL = "accounts.CustomUser"

# ─── Password Validation ──────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ─── Internationalization ─────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ─── Static & Media Files ─────────────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── Redis & Caching ──────────────────────────────────────────────────────────
REDIS_URL = env("REDIS_URL", default="redis://redis:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": {"max_connections": 50},
            "IGNORE_EXCEPTIONS": True,
        },
        "KEY_PREFIX": "amanapos",
        "TIMEOUT": 300,
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

# ─── Celery ───────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://redis:6379/1")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://redis:6379/2")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60  # 25 minutes
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_ACKS_LATE = True
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

CELERY_TASK_ROUTES = {
    "apps.notifications.tasks.*": {"queue": "notifications"},
    "apps.sales.tasks.*": {"queue": "default"},
    "apps.inventory.tasks.*": {"queue": "default"},
}

CELERY_BEAT_SCHEDULE = {
    "cleanup-expired-otps": {
        "task": "apps.accounts.tasks.cleanup_expired_otps",
        "schedule": 3600.0,  # every hour
    },
    "check-subscription-expiry": {
        "task": "apps.subscriptions.tasks.check_subscription_expiry",
        "schedule": 86400.0,  # daily
    },
    "requeue-stuck-deliveries": {
        "task": "apps.notifications.tasks.requeue_stuck_deliveries",
        "schedule": 300.0,   # every 5 minutes
    },
    "check-expiry-alerts": {
        "task": "apps.inventory.tasks.check_expiry_alerts",
        "schedule": 86400.0,  # daily
    },
}

# ─── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "10000/day",
        "auth": "10/minute",
        "otp": "5/minute",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "AmanaPOS API",
    "DESCRIPTION": "Point-of-Sale SaaS API for small businesses.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# ─── JWT Settings ─────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env("JWT_ACCESS_TOKEN_LIFETIME_MINUTES")),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env("JWT_REFRESH_TOKEN_LIFETIME_DAYS")),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
}

# ─── CORS ─────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-tenant-id",
]

# ─── Storage (MinIO / S3) ─────────────────────────────────────────────────────
USE_S3 = env("USE_S3")

if USE_S3:
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="amanapos-media")
    AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL", default="http://minio:9000")
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="us-east-1")
    AWS_DEFAULT_ACL = env("AWS_DEFAULT_ACL", default="private")
    AWS_S3_CUSTOM_DOMAIN = env("AWS_S3_CUSTOM_DOMAIN", default="")
    AWS_S3_OBJECT_PARAMETERS = {
        "CacheControl": "max-age=86400",
    }
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = True
    AWS_QUERYSTRING_EXPIRE = 3600

    AWS_S3_PUBLIC_BUCKET_NAME = env("AWS_S3_PUBLIC_BUCKET_NAME", default="amanapos-public")
    AWS_S3_PRIVATE_BUCKET_NAME = env("AWS_S3_PRIVATE_BUCKET_NAME", default="amanapos-private")

    # Public-facing base URL for the MinIO server (used to build image URLs).
    # Dev example:   http://localhost:9000
    # Prod example:  https://assets.amanapos.com
    MINIO_PUBLIC_URL = env("MINIO_PUBLIC_URL", default="")

    STORAGES = {
        "default": {
            "BACKEND": "apps.core.storage.PrivateMediaStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

# ─── Image Upload ──────────────────────────────────────────────────────────────
MAX_IMAGE_UPLOAD_MB = env.int("MAX_IMAGE_UPLOAD_MB", default=10)

# ─── OTP Settings ─────────────────────────────────────────────────────────────
OTP_LENGTH                 = env("OTP_LENGTH")
OTP_EXPIRY_SECONDS         = env("OTP_EXPIRY_SECONDS")
OTP_REDIS_PREFIX           = "otp"
OTP_PROVIDER               = env("OTP_PROVIDER")
DEFAULT_OTP_CHANNEL        = env("DEFAULT_OTP_CHANNEL")
OTP_ALLOWED_CHANNELS       = env("OTP_ALLOWED_CHANNELS")
OTP_MAX_ATTEMPTS           = env("OTP_MAX_ATTEMPTS")
OTP_RESEND_COOLDOWN_SECONDS = env("OTP_RESEND_COOLDOWN_SECONDS")

# ─── SMS Settings ─────────────────────────────────────────────────────────────
SMS_PROVIDER = env("SMS_PROVIDER", default="stub")
SMS_API_KEY = env("SMS_API_KEY", default="")
SMS_SENDER_ID = env("SMS_SENDER_ID", default="AmanaPOS")
TWILIO_ACCOUNT_SID    = env("TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN     = env("TWILIO_AUTH_TOKEN", default="")
TWILIO_FROM_NUMBER    = env("TWILIO_FROM_NUMBER", default="")    # legacy
TWILIO_SMS_FROM       = env("TWILIO_SMS_FROM", default="")
TWILIO_WHATSAPP_FROM  = env("TWILIO_WHATSAPP_FROM", default="")
BUDGETSMS_USERNAME = env("BUDGETSMS_USERNAME", default="")
BUDGETSMS_USERID = env("BUDGETSMS_USERID", default="")
BUDGETSMS_HANDLE = env("BUDGETSMS_HANDLE", default="")
BUDGETSMS_SENDER_ID = env("BUDGETSMS_SENDER_ID", default="AmanaPOS")

# ─── Firebase / Push Notifications ────────────────────────────────────────────
# Set FIREBASE_ENABLED=True in production and supply exactly ONE of:
#   FIREBASE_CREDENTIALS_PATH  — absolute path to service-account JSON file
#   FIREBASE_SERVICE_ACCOUNT_JSON — the JSON content as a single-line string
# Never commit the service-account file to git.
FIREBASE_ENABLED                = env.bool("FIREBASE_ENABLED", default=False)
FIREBASE_CREDENTIALS_PATH       = env("FIREBASE_CREDENTIALS_PATH", default="")
FIREBASE_SERVICE_ACCOUNT_JSON   = env("FIREBASE_SERVICE_ACCOUNT_JSON", default="")
FIREBASE_PROJECT_ID             = env("FIREBASE_PROJECT_ID", default="")

# ─── Email ────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@amanapos.com")

# ─── Logging ──────────────────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] [{levelname}] [{name}] {message}",
            "style": "{",
        },
        "simple": {
            "format": "[{levelname}] {message}",
            "style": "{",
        },
    },
    "filters": {
        "require_debug_true": {
            "()": "django.utils.log.RequireDebugTrue",
        },
        "require_debug_false": {
            "()": "django.utils.log.RequireDebugFalse",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "mail_admins": {
            "level": "ERROR",
            "class": "django.utils.log.AdminEmailHandler",
            "filters": ["require_debug_false"],
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console", "mail_admins"],
            "level": "ERROR",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "celery": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
