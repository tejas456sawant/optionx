from functools import lru_cache
from os import getenv
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


class Settings:
    def __init__(self) -> None:
        self.tradestation_client_id = getenv("TRADESTATION_CLIENT_ID", "")
        self.tradestation_client_secret = getenv("TRADESTATION_CLIENT_SECRET", "")
        self.tradestation_refresh_token = getenv("TRADESTATION_REFRESH_TOKEN", "")
        self.tradestation_api_base_url = getenv(
            "TRADESTATION_API_BASE_URL",
            "https://api.tradestation.com/v3",
        ).rstrip("/")
        self.tradestation_token_url = getenv(
            "TRADESTATION_TOKEN_URL",
            "https://signin.tradestation.com/oauth/token",
        )
        self.database_url = getenv(
            "DATABASE_URL",
            "postgresql+psycopg://optionx:optionx@localhost:5432/optionx",
        )
        self.celery_broker_url = getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
        self.celery_result_backend = getenv(
            "CELERY_RESULT_BACKEND",
            self.celery_broker_url,
        )
        self.covered_call_symbols = [
            symbol.strip().upper()
            for symbol in getenv("COVERED_CALL_SYMBOLS", "").split(",")
            if symbol.strip()
        ]
        self.cron_secret = getenv("CRON_SECRET", "")

    def require_tradestation_credentials(self) -> None:
        missing = [
            name
            for name, value in {
                "TRADESTATION_CLIENT_ID": self.tradestation_client_id,
                "TRADESTATION_REFRESH_TOKEN": self.tradestation_refresh_token,
            }.items()
            if not value
        ]
        if missing:
            joined = ", ".join(missing)
            raise RuntimeError(f"Missing TradeStation environment variables: {joined}")


@lru_cache
def get_settings() -> Settings:
    return Settings()
