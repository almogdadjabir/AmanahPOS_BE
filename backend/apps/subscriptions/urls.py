from django.urls import path
from . import views

app_name = "subscriptions"

urlpatterns = [
    path("plans/", views.PlanListView.as_view(), name="plan_list"),
    path("", views.SubscriptionListView.as_view(), name="subscription_list"),
    path("subscribe/", views.SubscribeView.as_view(), name="subscribe"),
    path("current/", views.CurrentSubscriptionView.as_view(), name="current_subscription"),
]
