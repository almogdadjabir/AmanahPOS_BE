.PHONY: help build up up-prod down restart shell logs migrate makemigrations collectstatic createsuperuser test lint format clean

# Detect environment: use prod compose+env when .env.prod exists, otherwise local docker-compose.yml
ifneq (,$(wildcard .env.prod))
  COMPOSE      = docker compose -f docker-compose.prod.yml --env-file .env.prod
  COMPOSE_EXEC = docker compose -f docker-compose.prod.yml --env-file .env.prod exec app
else
  COMPOSE      = docker compose
  COMPOSE_EXEC = docker compose exec app
endif

# Default target
help:
	@echo "AmanaPOS - Available commands:"
	@echo ""
	@echo "  Docker:"
	@echo "    make build          Build all Docker images"
	@echo "    make up             Start all services in detached mode"
	@echo "    make deploy         Rebuild images (no cache) then start (use on server after git pull)"
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
	$(COMPOSE) build

up:
	$(COMPOSE) up -d

up-local:
	docker compose -f docker-compose.yml up

deploy:
	$(COMPOSE) build --no-cache && $(COMPOSE) up -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f

logs-app:
	$(COMPOSE) logs -f app

logs-worker:
	$(COMPOSE) logs -f celery_worker

logs-beat:
	$(COMPOSE) logs -f celery_beat

logs-nginx:
	$(COMPOSE) logs -f nginx

# ─── Django ────────────────────────────────────────────────────────────────────

shell:
	$(COMPOSE_EXEC) python manage.py shell_plus --ipython

bash:
	$(COMPOSE_EXEC) bash

migrate:
	$(COMPOSE_EXEC) python manage.py migrate

makemigrations:
	$(COMPOSE_EXEC) python manage.py makemigrations

makemigrations-init:
	$(COMPOSE) run --rm --entrypoint="" app python manage.py makemigrations

makemigrations-app:
	@read -p "App name: " app; \
	$(COMPOSE_EXEC) python manage.py makemigrations $$app

collectstatic:
	$(COMPOSE_EXEC) python manage.py collectstatic --noinput

createsuperuser:
	$(COMPOSE_EXEC) python manage.py createsuperuser

showmigrations:
	$(COMPOSE_EXEC) python manage.py showmigrations

check:
	$(COMPOSE_EXEC) python manage.py check

# ─── Testing & Quality ─────────────────────────────────────────────────────────

test:
	$(COMPOSE_EXEC) pytest

test-cov:
	$(COMPOSE_EXEC) pytest --cov=apps --cov-report=html --cov-report=term-missing

lint:
	$(COMPOSE_EXEC) flake8 apps/ config/

format:
	$(COMPOSE_EXEC) black apps/ config/
	$(COMPOSE_EXEC) isort apps/ config/

typecheck:
	$(COMPOSE_EXEC) mypy apps/ config/

# ─── Maintenance ───────────────────────────────────────────────────────────────

clean:
	$(COMPOSE) down -v --remove-orphans
	docker image prune -f

flush-redis:
	$(COMPOSE) exec redis redis-cli -a $${REDIS_PASSWORD} FLUSHALL

psql:
	$(COMPOSE_EXEC) python manage.py dbshell

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
