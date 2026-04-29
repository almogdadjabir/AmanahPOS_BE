from django.urls import path
from rest_framework_simplejwt.views import TokenBlacklistView, TokenVerifyView

from . import views

app_name = "accounts"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("set-password/", views.SetPasswordView.as_view(), name="set_password"),
    path("logout/", TokenBlacklistView.as_view(), name="logout"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
]
