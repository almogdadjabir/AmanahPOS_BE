# AmanaPOS — Quick Start

## Before you start

Make sure **Docker Desktop** is running.

---

## Step 1 — Create your `.env` file

```bash
make env
# Creates a .env file from .env.example
```

---

## Step 2 — Generate a secret key and paste it into `.env`

Run this to generate a secure key:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

Open `.env` and replace the `SECRET_KEY` line with the output:

```env
# .env
SECRET_KEY=paste-the-generated-key-here
DEBUG=False
```

> Without a real SECRET_KEY the app will refuse to start in production mode.

---

## Step 3 — Build the Docker images

```bash
make build
# Downloads base images and installs all Python dependencies.
# Takes ~3–5 minutes on first run.
```

---

## Step 4 — Start all services

```bash
make up
# Starts: Django app, Celery worker, Celery beat,
#         PostgreSQL, Redis, MinIO, Nginx
```

Wait about **30 seconds** for everything to come up. You can watch the logs:

```bash
make logs-app
# Press Ctrl+C to stop watching logs (services keep running)
```

---

## Step 5 — Verify it's running

Open these in your browser:

| URL                                        | What it is                                          |
| ------------------------------------------ | --------------------------------------------------- |
| `http://localhost:8080/api/v1/health/`     | API health check — should return `{"status": "ok"}` |
| `http://localhost:8080/admin/`             | Django admin panel                                  |
| `http://localhost:9001`                    | MinIO file storage console                          |

**From a phone on the same Wi-Fi** — find your Mac's local IP (e.g. `172.16.10.52`) and use:
`http://172.16.10.52:8080/api/v1/...`

MinIO login: **user** `minioadmin` / **password** `minioadmin`

---

## Step 6 — Import the Postman collection and start testing

1. Open Postman → **Import** → select `AmanaPOS.postman_collection.json`
2. Run requests in order: **Register → Verify OTP → Create Business → Create Shop → ...**
3. Tokens and IDs are saved automatically between requests

> In development the OTP is printed to the app logs. Run `make logs-app` and look for `OTP:` after calling Register.

---

## Useful commands

| Command               | What it does                                      |
| --------------------- | ------------------------------------------------- |
| `make logs-app`       | Live app logs                                     |
| `make logs-worker`    | Live Celery worker logs                           |
| `make migrate`        | Run pending DB migrations                         |
| `make makemigrations` | Create new migrations                             |
| `make shell`          | Open Django interactive shell                     |
| `make psql`           | Open PostgreSQL shell                             |
| `make flush-redis`    | Clear all Redis data (resets OTPs/cache)          |
| `make down`           | Stop all services                                 |
| `make clean`          | Stop all services **and delete all data volumes** |

---

## Stop the project

```bash
make down        # stops containers, keeps data
make clean       # stops containers + deletes database and storage
```
