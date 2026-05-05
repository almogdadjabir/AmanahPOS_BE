from django.urls import path
from . import views

app_name = "offline"

urlpatterns = [
    path("bootstrap/", views.BootstrapView.as_view(), name="bootstrap"),
    path("assets/manifest/", views.AssetManifestView.as_view(), name="asset_manifest"),
]
