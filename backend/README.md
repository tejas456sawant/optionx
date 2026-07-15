## OptionX Backend

The backend integrates with TradeStation, persists covered-call scans in Postgres,
and runs larger stock-list scans through Celery.

## Setup

Copy `.env.example` to `.env` and set:

```bash
TRADESTATION_CLIENT_ID=your_client_id
TRADESTATION_CLIENT_SECRET=your_client_secret
TRADESTATION_REFRESH_TOKEN=your_refresh_token
DATABASE_URL=postgresql+psycopg://optionx:optionx@localhost:5432/optionx
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
COVERED_CALL_SYMBOLS=NVDA,SNDK,AAPL
CRON_SECRET=change_me
```

Start Postgres and Redis from the repo root:

```bash
docker compose up -d postgres redis
```

Install and run the API from `backend/`:

```bash
uv sync
uv run uvicorn main:app --reload
```

Run the Celery worker in a second terminal:

```bash
uv run celery -A app.celery_app.celery_app worker --loglevel=info
```

Postgres and Redis must be running before the API and worker start.

## Production service

Example `systemd` units for running the API and Celery continuously are in
[`../deploy/systemd/`](../deploy/systemd/README.md). They run the API on port
`5000` by default and include instructions for switching it to port `7000`.

## Covered Calls

Immediate single-symbol scan:

```bash
curl "http://127.0.0.1:5000/covered-calls?symbol=NVDA"
```

Background stock-list scan:

```bash
curl -X POST "http://127.0.0.1:5000/covered-calls/jobs" \
  -H "content-type: application/json" \
  -d '{"symbols":["NVDA","SNDK"],"strike_proximity":80,"expiration_limit":0}'
```

Cron-triggered scan using `COVERED_CALL_SYMBOLS`:

```bash
curl "http://127.0.0.1:5000/cron/covered-calls?token=change_me"
```

The scanner only saves monthly and LEAPS-style expirations returned by
TradeStation.
