"""
Views for the accounts app.
"""
import logging

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle

from apps.core.exceptions import BusinessLogicError
from apps.core.permissions import IsOwner, HasBusiness
from apps.subscriptions.guards import check_user_limit
from .models import BankakAccount, CustomUser
from .serializers import (
    BankakAccountSerializer,
    BankakAccountWriteSerializer,
    LoginOTPSerializer,
    LoginOTPVerifySerializer,
    LoginPasswordSerializer,
    RegisterSerializer,
    SetPasswordSerializer,
    UserProfileSerializer,
    StaffUserSerializer,
    StaffUserCreateSerializer,
    StaffUserUpdateSerializer,
)
from .services import (
    get_default_bankak_account,
    login_with_password,
    register_user,
    remove_bankak_account,
    request_login_otp,
    set_bankak_account,
    set_user_password,
    verify_login_otp,
    get_tokens_for_user,
)

logger = logging.getLogger(__name__)


class OTPRateThrottle(AnonRateThrottle):
    scope = "otp"


class AuthRateThrottle(AnonRateThrottle):
    scope = "auth"


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/
    Internal-only: staff creates an owner account.
    The owner then logs in via the normal phone + OTP flow.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = register_user(
            phone=data["phone"],
            full_name=data["full_name"],
            email=data.get("email"),
            bankak_account_number=data.get("bankak_account_number") or None,
        )

        from apps.activity_logs.service import log_activity
        from apps.activity_logs.models import ActivityLog as AL
        log_activity(
            actor=request.user,
            action=AL.ActionType.OWNER_CREATED,
            entity_type="owner",
            entity_id=user.id,
            entity_label=user.full_name or user.phone,
            request=request,
        )

        bankak = get_default_bankak_account(user)
        return Response(
            {
                "success": True,
                "message": "Owner account created. They can now log in with their phone.",
                "data": {
                    "user_id": str(user.id),
                    "phone": user.phone,
                    "full_name": user.full_name,
                    "role": user.role,
                    "bankak_account": BankakAccountSerializer(bankak).data if bankak else None,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginOTPRequestView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        from django.conf import settings

        serializer = LoginOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone   = serializer.validated_data["phone"]
        channel = serializer.validated_data.get("channel")

        request_login_otp(phone=phone, channel=channel)

        return Response({
            "success":      True,
            "message":      "OTP sent successfully.",
            "expires_in":   getattr(settings, "OTP_EXPIRY_SECONDS", 300),
            "resend_after": getattr(settings, "OTP_RESEND_COOLDOWN_SECONDS", 60),
        })


class LoginOTPVerifyView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        serializer = LoginOTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Capture first-login state BEFORE the service stamps last_login_at.
        is_first_login = not CustomUser.objects.filter(
            phone=data["phone"],
            last_login_at__isnull=False,
        ).exists()

        result = verify_login_otp(
            phone=data["phone"],
            otp=data["otp"],
            channel=data.get("channel"),
        )
        user = result.pop("user")

        # ── FCM token registration ────────────────────────────────────────────
        device_is_new = False
        if data.get("fcm_token") and data.get("platform"):
            try:
                from django.utils import timezone
                from apps.notifications.models import DeviceToken

                token_existed = DeviceToken.objects.filter(
                    token=data["fcm_token"]
                ).exists()

                DeviceToken.objects.update_or_create(
                    token=data["fcm_token"],
                    defaults={
                        "user":        user,
                        "platform":    data["platform"],
                        "device_id":   data.get("device_id") or "",
                        "app_version": data.get("app_version") or "",
                        "is_active":   True,
                        "last_seen_at": timezone.now(),
                    },
                )
                device_is_new = not token_existed
            except Exception:
                logger.exception("Failed to register FCM token during login for user %s", user.id)

        # ── Login notifications ───────────────────────────────────────────────
        try:
            from apps.notifications.services import notify_user
            from apps.notifications.notification_templates import render_notification

            if is_first_login:
                notify_user(user, **render_notification("welcome"))
            elif device_is_new:
                # Build a human-readable device label from what the client sent.
                device_name = (
                    data.get("device_name")
                    or {
                        "android": "Android device",
                        "ios":     "iOS device",
                        "web":     "web browser",
                    }.get(data.get("platform", ""), "new device")
                )
                notify_user(
                    user,
                    **render_notification("new_device_login", device_name=device_name),
                )
        except Exception:
            logger.exception("Failed to send login notification for user %s", user.id)

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": {
                    **result,
                    "user": UserProfileSerializer(user).data,
                },
            }
        )


class LoginPasswordView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = LoginPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        result = login_with_password(phone=data["phone"], password=data["password"])
        user = result.pop("user")

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": {
                    **result,
                    "user": UserProfileSerializer(user).data,
                },
            },
            status=status.HTTP_200_OK,
        )


class ProfileView(APIView):
    """
    GET  /api/v1/auth/profile/  - Retrieve current user profile
    PATCH /api/v1/auth/profile/ - Update current user profile
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = (
            CustomUser.objects
            .select_related("business__owner")
            .get(pk=request.user.pk)
        )
        serializer = UserProfileSerializer(user)
        return Response({"success": True, "data": serializer.data})

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "success": True,
                "message": "Profile updated successfully.",
                "data": serializer.data,
            }
        )


class SetPasswordView(APIView):
    """
    POST /api/v1/auth/set-password/
    Set or change the user's password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SetPasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        set_user_password(request.user, serializer.validated_data["password"])
        return Response(
            {
                "success": True,
                "message": "Password set successfully.",
            },
            status=status.HTTP_200_OK,
        )


class UserListCreateView(APIView):
    """
    GET  /api/v1/users/  — List all staff in the owner's business.
    POST /api/v1/users/  — Add a new manager or cashier.

    Requires: owner role + business created.
    """
    permission_classes = [IsAuthenticated, IsOwner, HasBusiness]

    def get(self, request):
        users = (
            CustomUser.objects
            .filter(business=request.user.business)
            .exclude(id=request.user.id)
            .order_by("role", "full_name")
        )
        return Response({
            "success": True,
            "data": StaffUserSerializer(users, many=True).data,
        })

    def post(self, request):
        check_user_limit(request.user.business)
        serializer = StaffUserCreateSerializer(
            data=request.data,
            context={"business": request.user.business},
        )
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        user = CustomUser.objects.create_user(
            phone=d["phone"],
            full_name=d["full_name"],
            role=d["role"],
            business=request.user.business,
            default_shop_id=d.get("default_shop_id"),
            is_verified=False,
        )
        return Response(
            {
                "success": True,
                "message": f"{d['role'].capitalize()} created. They can now log in with their phone.",
                "data": StaffUserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class UserDetailView(APIView):
    """
    GET    /api/v1/users/{id}/  — Get staff user detail.
    PATCH  /api/v1/users/{id}/  — Update name, role, or active status.
    DELETE /api/v1/users/{id}/  — Deactivate (soft delete).

    Requires: owner role + business created.
    """
    permission_classes = [IsAuthenticated, IsOwner, HasBusiness]

    def _get_staff(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk, business=request.user.business)
        except CustomUser.DoesNotExist:
            from apps.core.exceptions import NotFound
            raise NotFound("User not found in your business.")
        if user.id == request.user.id:
            raise BusinessLogicError("Use /auth/profile/ to manage your own account.")
        return user

    def get(self, request, pk):
        user = self._get_staff(request, pk)
        return Response({"success": True, "data": StaffUserSerializer(user).data})

    def patch(self, request, pk):
        user = self._get_staff(request, pk)
        serializer = StaffUserUpdateSerializer(
            user, data=request.data, partial=True,
            context={"business": request.user.business},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            "success": True,
            "message": "User updated.",
            "data": StaffUserSerializer(user).data,
        })

    def delete(self, request, pk):
        user = self._get_staff(request, pk)
        user.is_active = False
        user.save(update_fields=["is_active", "updated_at"])
        return Response({"success": True, "message": "User deactivated."})


class BankakAccountView(APIView):
    """
    GET    /api/v1/auth/bankak/  → get my Bankak account (owner only)
    POST   /api/v1/auth/bankak/  → create or update my Bankak account
    DELETE /api/v1/auth/bankak/  → remove my Bankak account
    """
    permission_classes = [IsAuthenticated]

    def _require_owner(self, user):
        if not (user.role == "owner" or user.is_staff):
            from apps.core.exceptions import NotFound
            raise BusinessLogicError("Only owners can manage Bankak accounts.", code="PERMISSION_DENIED")

    def get(self, request):
        self._require_owner(request.user)
        account = get_default_bankak_account(request.user)
        if not account:
            return Response({"success": True, "data": None})
        return Response({"success": True, "data": BankakAccountSerializer(account).data})

    def post(self, request):
        self._require_owner(request.user)
        serializer = BankakAccountWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = set_bankak_account(request.user, serializer.validated_data["account_number"])
        return Response(
            {"success": True, "message": "Bankak account saved.", "data": BankakAccountSerializer(account).data},
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        self._require_owner(request.user)
        remove_bankak_account(request.user)
        return Response({"success": True, "message": "Bankak account removed."})
