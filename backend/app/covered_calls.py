import asyncio
from datetime import date
from typing import Any

from app.tradestation import TradeStationClient, parse_tradestation_date


def _number(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _quote_price(quote: dict[str, Any]) -> float:
    for key in ("Last", "Ask", "Bid", "Close", "PreviousClose"):
        value = _number(quote.get(key))
        if value and value > 0:
            return value
    raise RuntimeError("Could not determine an underlying price from quote data")


async def scan_covered_calls(
    client: TradeStationClient,
    symbol: str,
    expiration_limit: int = 0,
    strike_proximity: int = 80,
    min_downside_protection_percent: float = 0.01,
    min_premium: float = 0.05,
) -> dict[str, Any]:
    quote = await client.get_quote(symbol)
    underlying_price = _quote_price(quote)
    expirations_payload = await client.get_option_expirations(symbol)
    all_expirations = expirations_payload.get("Expirations", [])
    eligible_expirations = [
        expiration
        for expiration in all_expirations
        if expiration.get("Type", "").lower() == "monthly"
    ]
    expirations = (
        eligible_expirations[:expiration_limit]
        if expiration_limit > 0
        else eligible_expirations
    )

    today = date.today()
    semaphore = asyncio.Semaphore(6)
    excluded_low_cushion = 0
    excluded_no_profit = 0

    async def scan_expiration(expiration: dict[str, Any]) -> list[dict[str, Any]]:
        nonlocal excluded_low_cushion, excluded_no_profit
        expiration_date = expiration["Date"]
        async with semaphore:
            chain = await client.stream_option_chain(
                symbol,
                expiration_date,
                strike_proximity=strike_proximity,
                price_center=underlying_price,
            )

        days_to_expiration = max(
            (parse_tradestation_date(expiration_date) - today).days,
            1,
        )

        expiration_opportunities: list[dict[str, Any]] = []
        for spread in chain:
            leg = spread["Legs"][0]
            strike = _number(leg.get("StrikePrice"))
            premium = _number(spread.get("Bid"))
            if not strike or not premium or premium <= 0:
                continue
            if premium < min_premium:
                excluded_low_cushion += 1
                continue

            net_debit = underlying_price - premium
            if net_debit <= 0:
                continue

            breakeven = net_debit
            downside_protection = premium / underlying_price
            if downside_protection < min_downside_protection_percent:
                excluded_low_cushion += 1
                continue

            max_profit = strike - breakeven
            if max_profit <= 0:
                excluded_no_profit += 1
                continue

            max_profit_percent = max_profit / breakeven
            annualized_return = max_profit_percent * 365 / days_to_expiration

            expiration_opportunities.append(
                {
                    "symbol": leg.get("Symbol"),
                    "underlying": symbol,
                    "underlyingPrice": round(underlying_price, 4),
                    "expiration": expiration_date,
                    "expirationType": expiration.get("Type", ""),
                    "daysToExpiration": days_to_expiration,
                    "strike": strike,
                    "premium": premium,
                    "netDebit": round(net_debit, 4),
                    "capitalRequired": round(net_debit * 100, 2),
                    "breakeven": round(breakeven, 4),
                    "downsideProtectionPercent": round(downside_protection, 6),
                    "maxProfit": round(max_profit * 100, 2),
                    "maxProfitPercent": round(max_profit_percent, 6),
                    "annualizedReturnPercent": round(annualized_return, 6),
                    "assignedReturnPercent": round(
                        ((strike + premium - underlying_price) / net_debit),
                        6,
                    ),
                    "bid": _number(spread.get("Bid")),
                    "ask": _number(spread.get("Ask")),
                    "mid": _number(spread.get("Mid")),
                    "last": _number(spread.get("Last")),
                    "delta": _number(spread.get("Delta")),
                    "probabilityITM": _number(spread.get("ProbabilityITM")),
                    "probabilityOTM": _number(spread.get("ProbabilityOTM")),
                    "openInterest": spread.get("DailyOpenInterest"),
                    "volume": spread.get("Volume"),
                }
            )

        return expiration_opportunities

    results = await asyncio.gather(
        *(scan_expiration(expiration) for expiration in expirations),
    )
    opportunities = [item for expiration_rows in results for item in expiration_rows]
    opportunities.sort(key=lambda item: item["annualizedReturnPercent"], reverse=True)
    return {
        "symbol": symbol,
        "underlyingPrice": underlying_price,
        "quote": quote,
        "expirationCount": len(all_expirations),
        "eligibleExpirationCount": len(eligible_expirations),
        "expirationsScanned": len(expirations),
        "expirationFilter": "Monthly",
        "minimumDownsideProtectionPercent": min_downside_protection_percent,
        "minimumPremium": min_premium,
        "excludedLowCushionCount": excluded_low_cushion,
        "excludedNoProfitCount": excluded_no_profit,
        "opportunities": opportunities,
    }
