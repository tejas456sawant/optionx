# OptionX systemd services

These units run the FastAPI backend on port `5000` and the Celery worker as
separate processes. The `optionx.target` unit lets both processes be managed
together.

The unit files are configured for your server:

- the repository is deployed at `/home/ubuntu/optionx`;
- the Linux service account is named `ubuntu`;
- `uv sync --frozen` has created `/home/ubuntu/optionx/backend/.venv`;
- `/home/ubuntu/optionx/backend/.env` contains the production configuration; and
- Postgres and Redis are already available.

## Before installing

Confirm that the production environment file exists and contains real values
(do not overwrite an existing production `.env`):

```bash
cd /home/ubuntu/optionx/backend
test -f .env || cp .env.example .env
nano .env
```

At minimum, check the TradeStation credentials, `DATABASE_URL`,
`CELERY_BROKER_URL`, and `CELERY_RESULT_BACKEND`. Save the file before
continuing. Postgres and Redis must be running and reachable using those URLs.

## Install or update

Paste this block after the latest repository files are present on the server:

```bash
cd /home/ubuntu/optionx/backend
uv sync --frozen

test -x /home/ubuntu/optionx/backend/.venv/bin/uvicorn
test -x /home/ubuntu/optionx/backend/.venv/bin/celery
test -f /home/ubuntu/optionx/backend/.env

sudo install -m 0644 /home/ubuntu/optionx/deploy/systemd/optionx-api.service /etc/systemd/system/optionx-api.service
sudo install -m 0644 /home/ubuntu/optionx/deploy/systemd/optionx-celery.service /etc/systemd/system/optionx-celery.service
sudo install -m 0644 /home/ubuntu/optionx/deploy/systemd/optionx.target /etc/systemd/system/optionx.target
sudo systemctl daemon-reload
sudo systemctl enable optionx.target
sudo systemctl restart optionx.target
```

Check the API and both process states:

```bash
sudo systemctl status optionx-api optionx-celery --no-pager
curl --fail --show-error http://127.0.0.1:5000/health
```

A successful API check prints `{"status":"ok"}`.

Follow logs:

```bash
sudo journalctl -u optionx-api -f
sudo journalctl -u optionx-celery -f
```

After deploying new code or changing `.env`:

```bash
cd /home/ubuntu/optionx/backend
uv sync --frozen
sudo systemctl restart optionx.target
sudo systemctl status optionx-api optionx-celery --no-pager
curl --fail --show-error http://127.0.0.1:5000/health
```

To use port `7000`, change `--port 5000` to `--port 7000` in
`/home/ubuntu/optionx/deploy/systemd/optionx-api.service`, then reinstall that
unit and restart it:

```bash
sudo install -m 0644 /home/ubuntu/optionx/deploy/systemd/optionx-api.service /etc/systemd/system/optionx-api.service
sudo systemctl daemon-reload
sudo systemctl restart optionx-api
curl --fail --show-error http://127.0.0.1:7000/health
```

The API binds to `0.0.0.0`, so configure the server firewall/security group if
it should be reachable directly. If Nginx or another reverse proxy is used on
the same server, bind Uvicorn to `127.0.0.1` instead.
