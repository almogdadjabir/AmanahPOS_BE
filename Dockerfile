# =============================================================================
# AmanaPOS Dockerfile - Multi-stage build
# =============================================================================

# ─── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements/base.txt requirements/base.txt
COPY backend/requirements/production.txt requirements/production.txt

RUN pip install --upgrade pip && \
    pip wheel --wheel-dir /wheels \
    -r requirements/production.txt


# ─── Stage 2: Final ────────────────────────────────────────────────────────────
FROM python:3.12-slim AS final

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production \
    APP_HOME=/app

WORKDIR $APP_HOME

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built wheels from builder stage
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* && \
    rm -rf /wheels

# Create non-root user
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

# Copy application code
COPY backend/ $APP_HOME/

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create directories for static and media files
RUN mkdir -p $APP_HOME/staticfiles $APP_HOME/media && \
    chown -R appuser:appgroup $APP_HOME /entrypoint.sh

USER appuser

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
