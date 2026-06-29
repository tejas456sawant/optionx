from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import CoveredCallOpportunity, ScanJob


def normalize_symbols(symbols: list[str]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for value in symbols:
        symbol = value.strip().upper()
        if not symbol or symbol in seen:
            continue
        seen.add(symbol)
        normalized.append(symbol)
    return normalized


def create_scan_job(
    db: Session,
    symbols: list[str],
    source: str,
    strike_proximity: int,
    expiration_limit: int = 0,
) -> ScanJob:
    normalized = normalize_symbols(symbols)
    job = ScanJob(
        symbols=normalized,
        requested_count=len(normalized),
        source=source,
        strike_proximity=strike_proximity,
        expiration_limit=expiration_limit,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def count_job_opportunities(db: Session, job_id: str) -> int:
    return db.scalar(
        select(func.count(CoveredCallOpportunity.id)).where(
            CoveredCallOpportunity.job_id == job_id,
        )
    ) or 0


def serialize_job(job: ScanJob, opportunity_count: int | None = None) -> dict[str, Any]:
    return {
        "id": job.id,
        "status": job.status,
        "source": job.source,
        "symbols": job.symbols,
        "requestedCount": job.requested_count,
        "completedCount": job.completed_count,
        "failedCount": job.failed_count,
        "strikeProximity": job.strike_proximity,
        "expirationLimit": job.expiration_limit,
        "opportunityCount": opportunity_count,
        "error": job.error,
        "createdAt": job.created_at.isoformat() if job.created_at else None,
        "startedAt": job.started_at.isoformat() if job.started_at else None,
        "finishedAt": job.finished_at.isoformat() if job.finished_at else None,
    }


def serialize_opportunity(row: CoveredCallOpportunity) -> dict[str, Any]:
    return {
        "symbol": row.symbol,
        "underlying": row.underlying,
        "underlyingPrice": row.underlying_price,
        "expiration": row.expiration,
        "expirationType": row.expiration_type,
        "daysToExpiration": row.days_to_expiration,
        "strike": row.strike,
        "premium": row.premium,
        "netDebit": row.net_debit,
        "capitalRequired": row.capital_required,
        "breakeven": row.breakeven,
        "downsideProtectionPercent": row.downside_protection_percent,
        "maxProfit": row.max_profit,
        "maxProfitPercent": row.max_profit_percent,
        "annualizedReturnPercent": row.annualized_return_percent,
        "assignedReturnPercent": row.assigned_return_percent,
        "bid": row.bid,
        "ask": row.ask,
        "mid": row.mid,
        "last": row.last,
        "delta": row.delta,
        "probabilityITM": row.probability_itm,
        "probabilityOTM": row.probability_otm,
        "openInterest": row.open_interest,
        "volume": row.volume,
    }


def get_job_results(
    db: Session,
    job_id: str,
    limit: int = 500,
) -> list[dict[str, Any]]:
    rows = db.scalars(
        select(CoveredCallOpportunity)
        .where(CoveredCallOpportunity.job_id == job_id)
        .order_by(CoveredCallOpportunity.annualized_return_percent.desc())
        .limit(limit)
    ).all()
    return [serialize_opportunity(row) for row in rows]
