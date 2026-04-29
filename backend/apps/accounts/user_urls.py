from django.urls import path
from . import views

app_name = "users"

urlpatterns = [
    path("", views.UserListCreateView.as_view(), name="list_create"),
    path("<uuid:pk>/", views.UserDetailView.as_view(), name="detail"),
]
