from django.urls import path
from .views import AdminActivityLogListView

app_name = "activity_logs"

urlpatterns = [
    path("", AdminActivityLogListView.as_view(), name="list"),
]
