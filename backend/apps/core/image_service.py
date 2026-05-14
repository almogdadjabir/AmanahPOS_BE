"""
Image processing and MinIO upload service for AmanaPOS.

Handles validation, EXIF stripping, resizing, WebP conversion, thumbnail
generation, and upload to the public MinIO bucket.
"""
import io
import logging
import os

from django.conf import settings

logger = logging.getLogger(__name__)

# Supported MIME types detected via magic bytes
_MAGIC = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG": "image/png",
}
_WEBP_RIFF = b"RIFF"
_WEBP_MARKER = b"WEBP"

THUMBNAIL_SIZE = (400, 400)
MAX_ORIGINAL_DIM = 2048


# ── Validation ────────────────────────────────────────────────────────────────

def _detect_mime(data: bytes) -> str:
    if data[:3] in _MAGIC:
        return _MAGIC[data[:3]]
    if len(data) >= 12 and data[:4] == _WEBP_RIFF and data[8:12] == _WEBP_MARKER:
        return "image/webp"
    return "unknown"


def _validate_image(image_bytes: bytes) -> None:
    max_mb = getattr(settings, "MAX_IMAGE_UPLOAD_MB", 10)
    max_bytes = max_mb * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise ValueError(f"Image too large. Maximum allowed size is {max_mb} MB.")

    mime = _detect_mime(image_bytes)
    if mime not in ("image/jpeg", "image/png", "image/webp"):
        raise ValueError(
            "Unsupported image format. Allowed formats: JPEG, PNG, WebP."
        )


# ── Processing ────────────────────────────────────────────────────────────────

def _process_image(image_bytes: bytes) -> tuple[bytes, bytes]:
    """
    Convert, resize, strip EXIF, and generate thumbnail.
    Returns (original_webp_bytes, thumbnail_webp_bytes).
    """
    from PIL import Image, ImageOps

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.load()  # Force decode to detect corrupt files early
    except Exception as exc:
        raise ValueError(f"Could not read image: {exc}") from exc

    # Fix orientation from EXIF metadata before stripping it
    img = ImageOps.exif_transpose(img)

    # Flatten transparency to white background (no alpha in WebP with quality<100)
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Resize original if larger than maximum dimension
    if img.width > MAX_ORIGINAL_DIM or img.height > MAX_ORIGINAL_DIM:
        img.thumbnail((MAX_ORIGINAL_DIM, MAX_ORIGINAL_DIM), Image.LANCZOS)

    # Save original as WebP (no exif= kwarg → EXIF is stripped)
    orig_buf = io.BytesIO()
    img.save(orig_buf, format="WEBP", quality=85, method=6)

    # Thumbnail: resize a copy
    thumb_img = img.copy()
    thumb_img.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)
    thumb_buf = io.BytesIO()
    thumb_img.save(thumb_buf, format="WEBP", quality=80, method=6)

    return orig_buf.getvalue(), thumb_buf.getvalue()


# ── Storage ───────────────────────────────────────────────────────────────────

def _upload_to_minio(key: str, data: bytes, content_type: str = "image/webp") -> None:
    import boto3

    s3 = boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=getattr(settings, "AWS_S3_REGION_NAME", "us-east-1"),
    )
    bucket = settings.AWS_S3_PUBLIC_BUCKET_NAME
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType=content_type,
        ACL="public-read",
        CacheControl="public, max-age=86400",
    )
    logger.debug("Uploaded to MinIO: %s/%s", bucket, key)


def _save_to_local(key: str, data: bytes) -> None:
    """Fallback for local development without MinIO."""
    full_path = os.path.join(settings.MEDIA_ROOT, key)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "wb") as fh:
        fh.write(data)
    logger.debug("Saved locally: %s", full_path)


# ── Public API ────────────────────────────────────────────────────────────────

def process_and_upload_image(
    image_file,
    business_id: str,
    entity_type: str,
    entity_id: str,
) -> dict[str, str]:
    """
    Validate, process, and upload a product/category image.

    Parameters
    ----------
    image_file : file-like object (from DRF ImageField / request.FILES)
    business_id : str UUID of the owning business
    entity_type : "products" | "categories"
    entity_id : str UUID of the product or category

    Returns
    -------
    {"image": "<key>", "thumbnail": "<key>"}
    Object keys stored in the DB; pass to build_image_url() for full URLs.
    """
    image_file.seek(0)
    image_bytes = image_file.read()

    _validate_image(image_bytes)
    original_bytes, thumbnail_bytes = _process_image(image_bytes)

    image_key = f"businesses/{business_id}/{entity_type}/{entity_id}/original.webp"
    thumb_key = f"businesses/{business_id}/{entity_type}/{entity_id}/thumb.webp"

    use_s3 = getattr(settings, "USE_S3", False)
    if use_s3:
        _upload_to_minio(image_key, original_bytes)
        _upload_to_minio(thumb_key, thumbnail_bytes)
    else:
        _save_to_local(image_key, original_bytes)
        _save_to_local(thumb_key, thumbnail_bytes)

    logger.info("Image upload complete: %s/%s (%s)", entity_type, entity_id, entity_type)
    return {"image": image_key, "thumbnail": thumb_key}


def delete_images(business_id: str, entity_type: str, entity_id: str) -> None:
    """
    Remove original and thumbnail from storage (best-effort, never raises).
    Called when an image is replaced or the entity is deleted.
    """
    image_key = f"businesses/{business_id}/{entity_type}/{entity_id}/original.webp"
    thumb_key = f"businesses/{business_id}/{entity_type}/{entity_id}/thumb.webp"

    use_s3 = getattr(settings, "USE_S3", False)
    for key in (image_key, thumb_key):
        try:
            if use_s3:
                import boto3
                s3 = boto3.client(
                    "s3",
                    endpoint_url=settings.AWS_S3_ENDPOINT_URL,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=getattr(settings, "AWS_S3_REGION_NAME", "us-east-1"),
                )
                s3.delete_object(Bucket=settings.AWS_S3_PUBLIC_BUCKET_NAME, Key=key)
            else:
                full_path = os.path.join(settings.MEDIA_ROOT, key)
                if os.path.exists(full_path):
                    os.remove(full_path)
        except Exception as exc:
            logger.warning("Failed to delete image %s: %s", key, exc)


def build_image_url(key: str | None, request=None, version: int | None = None) -> str | None:
    """
    Build the full absolute URL for a stored image key.

    In production (USE_S3=True): returns the MinIO/CDN public URL.
    In local dev (USE_S3=False): uses the incoming request to build
    a full http://host:port/media/... URL so mobile clients get a
    reachable address rather than a bare relative path.

    Pass ``request`` (from serializer context) whenever available.
    Pass ``version`` (epoch integer from updated_at) to append a ?v= cache-busting
    parameter so browsers re-fetch after an image is replaced.
    """
    if not key:
        return None

    use_s3 = getattr(settings, "USE_S3", False)
    if not use_s3:
        path = f"{settings.MEDIA_URL}{key}"
        url = request.build_absolute_uri(path) if request is not None else path
    else:
        public_url = getattr(settings, "MINIO_PUBLIC_URL", "").rstrip("/")
        bucket = getattr(settings, "AWS_S3_PUBLIC_BUCKET_NAME", "amanapos-public")
        if public_url:
            url = f"{public_url}/{bucket}/{key}"
        else:
            endpoint = getattr(settings, "AWS_S3_ENDPOINT_URL", "").rstrip("/")
            url = f"{endpoint}/{bucket}/{key}"

    if version:
        url = f"{url}?v={version}"
    return url
