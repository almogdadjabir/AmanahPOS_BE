from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

app_name = "auth_public"

urlpatterns = [
    path("login/otp/", views.LoginOTPRequestView.as_view(), name="login_otp_request"),
    path("login/otp/verify/", views.LoginOTPVerifyView.as_view(), name="login_otp_verify"),
    path("login/password/", views.LoginPasswordView.as_view(), name="login_password"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
