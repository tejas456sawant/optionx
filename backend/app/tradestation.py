import asyncio
import time
from datetime import date, datetime
from typing import Any

import httpx

from app.config import Settings


class TradeStationClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._access_token: str | None = None
        self._access_token_expires_at = 0.0

    async def get_option_expirations(self, underlying: str) -> dict[str, Any]:
        token = await self._get_access_token()
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{self.settings.tradestation_api_base_url}/marketdata/options/expirations/{underlying}",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            return response.json()

    async def get_quote(self, symbol: str) -> dict[str, Any]:
        token = await self._get_access_token()
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{self.settings.tradestation_api_base_url}/marketdata/quotes/{symbol}",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            payload = response.json()

        quotes = payload.get("Quotes", [])
        if not quotes:
            raise RuntimeError(f"No quote returned for {symbol}")
        return quotes[0]

    async def stream_option_chain(
        self,
        underlying: str,
        expiration: str,
        strike_proximity: int,
        price_center: float | None = None,
    ) -> list[dict[str, Any]]:
        token = await self._get_access_token()
        params: dict[str, Any] = {
            "expiration": expiration,
            "strikeProximity": strike_proximity,
            "spreadType": "Single",
            "optionType": "Call",
            "strikeRange": "All",
            "enableGreeks": "true",
        }
        if price_center is not None:
            params["priceCenter"] = price_center

        spreads: list[dict[str, Any]] = []
        seen_symbols: set[str] = set()
        target_spread_count = strike_proximity * 2 + 1
        try:
            async with asyncio.timeout(12):
                async with httpx.AsyncClient(timeout=20.0) as client:
                    async with client.stream(
                        "GET",
                        f"{self.settings.tradestation_api_base_url}/marketdata/stream/options/chains/{underlying}",
                        headers={"Authorization": f"Bearer {token}"},
                        params=params,
                    ) as response:
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            if not line:
                                continue
                            event = _safe_json(line)
                            if not event or "Heartbeat" in event:
                                if spreads:
                                    break
                                continue
                            if event.get("StreamStatus") == "EndSnapshot":
                                break
                            if "Error" in event:
                                raise RuntimeError(event.get("Message", event["Error"]))
                            if event.get("Side") == "Call" and event.get("Legs"):
                                symbol = event["Legs"][0].get("Symbol")
                                if symbol in seen_symbols:
                                    continue
                                if symbol:
                                    seen_symbols.add(symbol)
                                spreads.append(event)
                                if len(spreads) >= target_spread_count:
                                    break
        except TimeoutError:
            return spreads

        return spreads

    async def _get_access_token(self) -> str:
        if self._access_token and time.time() < self._access_token_expires_at:
            return self._access_token

        self.settings.require_tradestation_credentials()
        payload = {
            "grant_type": "refresh_token",
            "client_id": self.settings.tradestation_client_id,
            "refresh_token": self.settings.tradestation_refresh_token,
        }
        if self.settings.tradestation_client_secret:
            payload["client_secret"] = self.settings.tradestation_client_secret

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                self.settings.tradestation_token_url,
                data=payload,
                headers={"content-type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            token_response = response.json()

        self._access_token = token_response["access_token"]
        expires_in = int(token_response.get("expires_in", 1200))
        self._access_token_expires_at = time.time() + max(expires_in - 60, 0)
        return self._access_token


def _safe_json(line: str) -> dict[str, Any] | None:
    try:
        return httpx.Response(200, content=line).json()
    except ValueError:
        return None


def parse_tradestation_date(value: str) -> date:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
