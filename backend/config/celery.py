"""
AmanaPOS Celery Configuration
"""
import os

from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

app = Celery("amanapos")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django apps.
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery connectivity."""
    print(f"Request: {self.request!r}")


# ─── Error handling ───────────────────────────────────────────────────────────
@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """Register periodic tasks defined outside of CELERY_BEAT_SCHEDULE."""
    pass
