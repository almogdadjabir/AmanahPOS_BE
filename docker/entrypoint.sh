#!/bin/bash
set -e

# =============================================================================
# AmanaPOS Docker Entrypoint
# =============================================================================

echo "========================================="
echo "  AmanaPOS - Starting..."
echo "========================================="

# ─── Wait for PostgreSQL ───────────────────────────────────────────────────────
echo "[entrypoint] Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until nc -z "${DB_HOST:-postgres}" "${DB_PORT:-5432}"; do
    echo "[entrypoint] PostgreSQL not ready - sleeping 2s..."
    sleep 2
done
echo "[entrypoint] PostgreSQL is up!"

# ─── Wait for Redis ────────────────────────────────────────────────────────────
echo "[entrypoint] Waiting for Redis..."
# Strip credentials (redis://:pass@host:port) before parsing host/port
_REDIS_URL_CLEAN=$(echo "${REDIS_URL:-redis://redis:6379/0}" | sed -E 's|redis://[^@]+@|redis://|')
REDIS_HOST=$(echo "$_REDIS_URL_CLEAN" | sed -E 's|redis://([^:/]+).*|\1|')
REDIS_PORT=$(echo "$_REDIS_URL_CLEAN" | sed -E 's|redis://[^:]+:([0-9]+).*|\1|')
until nc -z "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}"; do
    echo "[entrypoint] Redis not ready - sleeping 2s..."
    sleep 2
done
echo "[entrypoint] Redis is up!"

# ─── Run Migrations & Static (only for the gunicorn/web service) ──────────────
CMD_CHECK="${1:-gunicorn}"
if [ "$CMD_CHECK" = "gunicorn" ]; then
    echo "[entrypoint] Running database migrations..."
    python manage.py migrate --noinput

    echo "[entrypoint] Collecting static files..."
    python manage.py collectstatic --noinput --clear
else
    echo "[entrypoint] Skipping migrations and collectstatic for non-web service."
fi

# ─── Create default superuser if env vars are set (gunicorn only) ─────────────
if [ "$CMD_CHECK" = "gunicorn" ] && [ -n "${DJANGO_SUPERUSER_EMAIL}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD}" ]; then
    echo "[entrypoint] Creating superuser if not exists..."
    python manage.py shell -c "
from apps.accounts.models import CustomUser
if not CustomUser.objects.filter(email='${DJANGO_SUPERUSER_EMAIL}').exists():
    user = CustomUser.objects.create_superuser(
        phone='${DJANGO_SUPERUSER_PHONE:-+10000000000}',
        email='${DJANGO_SUPERUSER_EMAIL}',
        password='${DJANGO_SUPERUSER_PASSWORD}',
        full_name='${DJANGO_SUPERUSER_NAME:-Admin}',
    )
    print(f'Superuser created: {user.email}')
else:
    print('Superuser already exists.')
" 2>/dev/null || echo "[entrypoint] Superuser creation skipped."
fi

# ─── Determine command to run ─────────────────────────────────────────────────
CMD="${1:-gunicorn}"


case "$CMD" in
    gunicorn)
        echo "[entrypoint] Starting Gunicorn..."
        if [ "$#" -gt 1 ]; then
            # Explicit command passed (used by docker-compose.prod.yml)
            exec "$@"
        else
            exec gunicorn config.wsgi:application \
                --bind 0.0.0.0:8000 \
                --workers "${GUNICORN_WORKERS:-4}" \
                --worker-class gthread \
                --threads 2 \
                --timeout "${GUNICORN_TIMEOUT:-120}" \
                --keep-alive 5 \
                --max-requests 1000 \
                --max-requests-jitter 50 \
                --log-level info \
                --access-logfile - \
                --error-logfile - \
                --forwarded-allow-ips="*"
        fi
        ;;
    celery)
        echo "[entrypoint] Starting Celery worker..."
        exec celery -A config.celery worker \
            --loglevel=info \
            --concurrency=4 \
            -Q default,notifications,reports
        ;;
    celery-beat)
        echo "[entrypoint] Starting Celery beat..."
        exec celery -A config.celery beat \
            --loglevel=info \
            --scheduler django_celery_beat.schedulers:DatabaseScheduler
        ;;
    *)
        echo "[entrypoint] Running custom command: $@"
        exec "$@"
        ;;
esac
