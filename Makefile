.PHONY: help build up down restart shell logs migrate makemigrations collectstatic createsuperuser test lint format clean

# Default target
help:
	@echo "AmanaPOS - Available commands:"
	@echo ""
	@echo "  Docker:"
	@echo "    make build          Build all Docker images"
	@echo "    make up             Start all services in detached mode"
	@echo "    make down           Stop all services"
	@echo "    make restart        Restart all services"
	@echo "    make logs           Tail logs for all services"
	@echo "    make logs-app       Tail logs for the app service"
	@echo "    make logs-worker    Tail logs for the celery worker"
	@echo ""
	@echo "  Django:"
	@echo "    make shell          Open Django shell"
	@echo "    make bash           Open bash shell in app container"
	@echo "    make migrate        Run database migrations"
	@echo "    make makemigrations Create new migrations"
	@echo "    make collectstatic  Collect static files"
	@echo "    make createsuperuser Create a Django superuser"
	@echo ""
	@echo "  Testing & Quality:"
	@echo "    make test           Run all tests"
	@echo "    make test-cov       Run tests with coverage report"
	@echo "    make lint           Run flake8 linter"
	@echo "    make format         Run black formatter"
	@echo "    make typecheck      Run mypy type checker"
	@echo ""
	@echo "  Maintenance:"
	@echo "    make clean          Remove containers, volumes, and images"
	@echo "    make flush-redis    Flush all Redis data"
	@echo "    make psql           Open PostgreSQL shell"
	@echo "    make env            Copy .env.example to .env"

# ─── Docker ────────────────────────────────────────────────────────────────────

build:
	docker compose build

up:
	docker compose up -d

up-local:
	docker compose -f docker-compose.yml up

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

logs-app:
	docker compose logs -f app

logs-worker:
	docker compose logs -f celery_worker

logs-beat:
	docker compose logs -f celery_beat

logs-nginx:
	docker compose logs -f nginx

# ─── Django ────────────────────────────────────────────────────────────────────

shell:
	docker compose exec app python manage.py shell_plus --ipython

bash:
	docker compose exec app bash

migrate:
	docker compose exec app python manage.py migrate

makemigrations:
	docker compose exec app python manage.py makemigrations

makemigrations-init:
	docker compose run --rm --entrypoint="" app python manage.py makemigrations

makemigrations-app:
	@read -p "App name: " app; \
	docker compose exec app python manage.py makemigrations $$app

collectstatic:
	docker compose exec app python manage.py collectstatic --noinput

createsuperuser:
	docker compose exec app python manage.py createsuperuser

showmigrations:
	docker compose exec app python manage.py showmigrations

check:
	docker compose exec app python manage.py check

# ─── Testing & Quality ─────────────────────────────────────────────────────────

test:
	docker compose exec app pytest

test-cov:
	docker compose exec app pytest --cov=apps --cov-report=html --cov-report=term-missing

lint:
	docker compose exec app flake8 apps/ config/

format:
	docker compose exec app black apps/ config/
	docker compose exec app isort apps/ config/

typecheck:
	docker compose exec app mypy apps/ config/

# ─── Maintenance ───────────────────────────────────────────────────────────────

clean:
	docker compose down -v --remove-orphans
	docker image prune -f

flush-redis:
	docker compose exec redis redis-cli FLUSHALL

psql:
	docker compose exec postgres psql -U $${DB_USER:-amanapos} -d $${DB_NAME:-amanapos}

env:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo ".env file created from .env.example - please update the values"; \
	else \
		echo ".env file already exists"; \
	fi

# ─── Local Development (without Docker) ────────────────────────────────────────

install:
	pip install -r backend/requirements/local.txt

local-migrate:
	cd backend && python manage.py migrate

local-run:
	cd backend && python manage.py runserver 0.0.0.0:8000

local-worker:
	cd backend && celery -A config.celery worker -l info

local-beat:
	cd backend && celery -A config.celery beat -l info
