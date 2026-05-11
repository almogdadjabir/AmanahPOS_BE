"""
Firebase Cloud Messaging service for AmanaPOS.

Lazily initializes the Firebase Admin SDK on first use.
Safe to import even when Firebase is disabled — all methods return failure
results instead of raising exceptions so push failures never break
business-critical flows.
"""
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Tokens that FCM considers permanently invalid — deactivate these.
_INVALID_TOKEN_ERRORS = frozenset([
    "UNREGISTERED",
    "INVALID_ARGUMENT",
    "registration-token-not-registered",
])


@dataclass
class PushResult:
    success:        bool
    message_id:     str = ""
    error:          str = ""
    invalid_tokens: list = field(default_factory=list)


class FirebaseService:
    """Singleton wrapper around Firebase Admin SDK."""

    _initialized: bool = False
    _ready:       bool = False   # True only when SDK is fully initialised
    _app                = None

    # ── Initialisation ────────────────────────────────────────────────────────

    @classmethod
    def _init(cls) -> bool:
        """
        Initialise Firebase once per process. Returns True if ready.
        Safe to call multiple times — subsequent calls are no-ops.
        """
        if cls._initialized:
            return cls._ready

        cls._initialized = True

        from django.conf import settings

        if not getattr(settings, "FIREBASE_ENABLED", False):
            logger.info("Firebase disabled — push notifications will be skipped.")
            return False

        try:
            import firebase_admin
            from firebase_admin import credentials

            creds_path = getattr(settings, "FIREBASE_CREDENTIALS_PATH", "").strip()
            creds_json = getattr(settings, "FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()

            if creds_path:
                cred = credentials.Certificate(creds_path)
            elif creds_json:
                import json
                cred = credentials.Certificate(json.loads(creds_json))
            else:
                logger.error(
                    "FIREBASE_ENABLED=True but neither FIREBASE_CREDENTIALS_PATH "
                    "nor FIREBASE_SERVICE_ACCOUNT_JSON is set."
                )
                return False

            # Avoid double-init in multi-worker environments where the module
            # might already be initialised in the same process.
            try:
                cls._app = firebase_admin.initialize_app(cred)
            except ValueError:
                cls._app = firebase_admin.get_app()

            cls._ready = True
            logger.info("Firebase Admin SDK initialised.")
            return True

        except Exception:
            logger.exception("Failed to initialise Firebase Admin SDK.")
            return False

    # ── Public API ────────────────────────────────────────────────────────────

    @classmethod
    def send_to_token(cls, token: str, title: str, body: str, data: dict | None = None) -> PushResult:
        """
        Send a push notification to a single FCM token.

        FCM requires all `data` values to be strings — this method
        coerces them automatically.
        """
        if not cls._init():
            return PushResult(success=False, error="firebase_disabled")

        try:
            from firebase_admin import messaging

            safe_data = {k: str(v) for k, v in (data or {}).items()}
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=safe_data,
                token=token,
                android=messaging.AndroidConfig(priority="high"),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(content_available=True)
                    )
                ),
            )
            message_id = messaging.send(message, app=cls._app)
            return PushResult(success=True, message_id=message_id)

        except Exception as exc:
            error_str = str(exc)
            # Detect permanently invalid tokens
            if any(marker in error_str.upper() for marker in _INVALID_TOKEN_ERRORS):
                logger.warning("FCM token is invalid/unregistered — will deactivate.")
                return PushResult(success=False, error="invalid_token", invalid_tokens=[token])
            logger.warning("FCM send failed for token ...%s: %s", token[-6:], exc)
            return PushResult(success=False, error=error_str)

    @classmethod
    def send_to_user(
        cls,
        user,
        title: str,
        body: str,
        data: dict | None = None,
    ) -> list[PushResult]:
        """
        Send a push notification to all active device tokens for a user.

        Returns a list of PushResult (one per token). Deactivates invalid tokens.
        """
        from apps.notifications.models import DeviceToken

        tokens = list(
            DeviceToken.objects.filter(user=user, is_active=True)
            .values_list("id", "token")
        )

        if not tokens:
            return []

        results = []
        for token_id, token_value in tokens:
            result = cls.send_to_token(token_value, title, body, data)
            results.append(result)

            if result.invalid_tokens:
                # Permanently invalid — deactivate so we don't try again
                DeviceToken.objects.filter(pk=token_id).update(is_active=False)
                logger.info("Deactivated invalid FCM token id=%s", token_id)

        return results

    @classmethod
    def is_enabled(cls) -> bool:
        return cls._init()
