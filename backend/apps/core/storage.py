"""
Custom storage backends for AmanaPOS using django-storages + MinIO/S3.
"""
from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class PublicMediaStorage(S3Boto3Storage):
    """
    Storage for publicly accessible files (e.g., product images, logos).
    Files are served with a public URL, no query-string signing required.
    """
    bucket_name = None  # Set from settings
    custom_domain = None
    default_acl = "public-read"
    file_overwrite = False
    querystring_auth = False
    location = "public"

    def __init__(self, *args, **kwargs):
        self.bucket_name = getattr(settings, "AWS_S3_PUBLIC_BUCKET_NAME", settings.AWS_STORAGE_BUCKET_NAME)
        custom_domain = getattr(settings, "AWS_S3_CUSTOM_DOMAIN", "")
        if custom_domain:
            self.custom_domain = custom_domain
        super().__init__(*args, **kwargs)

    def url(self, name):
        url = super().url(name)
        return url


class PrivateMediaStorage(S3Boto3Storage):
    """
    Storage for private files (e.g., receipts, sensitive documents).
    Files are served with signed, time-limited URLs.
    """
    bucket_name = None
    default_acl = "private"
    file_overwrite = False
    querystring_auth = True
    querystring_expire = 3600  # 1 hour
    location = "private"

    def __init__(self, *args, **kwargs):
        self.bucket_name = getattr(settings, "AWS_S3_PRIVATE_BUCKET_NAME", settings.AWS_STORAGE_BUCKET_NAME)
        super().__init__(*args, **kwargs)


class MediaStorage(S3Boto3Storage):
    """
    General media storage (default bucket).
    Used as the DEFAULT_FILE_STORAGE backend.
    """
    bucket_name = None
    default_acl = "private"
    file_overwrite = False
    querystring_auth = True
    querystring_expire = 3600
    location = "media"

    def __init__(self, *args, **kwargs):
        self.bucket_name = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "amanapos-media")
        super().__init__(*args, **kwargs)


def get_public_storage():
    """Return an instance of PublicMediaStorage."""
    return PublicMediaStorage()


def get_private_storage():
    """Return an instance of PrivateMediaStorage."""
    return PrivateMediaStorage()


def get_public_url(file_name: str) -> str:
    """
    Generate a public URL for a file in the public bucket.
    """
    storage = PublicMediaStorage()
    return storage.url(file_name)


def get_private_url(file_name: str, expires_in: int = 3600) -> str:
    """
    Generate a signed URL for a private file, valid for `expires_in` seconds.
    """
    storage = PrivateMediaStorage()
    storage.querystring_expire = expires_in
    return storage.url(file_name)
