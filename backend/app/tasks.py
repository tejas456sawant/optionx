import asyncio
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete

from app.celery_app import celery_app
from app.config import get_settings
from app.covered_calls import scan_covered_calls
from app.database import SessionLocal
from app.models import CoveredCallOpportunity, ScanJob, ScanJobStatus
from app.tradestation import TradeStationClient


def _to_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _opportunity_from_payload(
    job_id: str,
    payload: dict[str, Any],
) -> CoveredCallOpportunity:
    return CoveredCallOpportunity(
        job_id=job_id,
        symbol=payload["symbol"],
        underlying=payload["underlying"],
        underlying_price=payload["underlyingPrice"],
        expiration=payload["expiration"],
        expiration_type=payload.get("expirationType", ""),
        days_to_expiration=payload["daysToExpiration"],
        strike=payload["strike"],
        premium=payload["premium"],
        net_debit=payload["netDebit"],
        capital_required=payload["capitalRequired"],
        breakeven=payload["breakeven"],
        downside_protection_percent=payload["downsideProtectionPercent"],
        max_profit=payload["maxProfit"],
        max_profit_percent=payload["maxProfitPercent"],
        annualized_return_percent=payload["annualizedReturnPercent"],
        assigned_return_percent=payload["assignedReturnPercent"],
        bid=payload.get("bid"),
        ask=payload.get("ask"),
        mid=payload.get("mid"),
        last=payload.get("last"),
        delta=payload.get("delta"),
        probability_itm=payload.get("probabilityITM"),
        probability_otm=payload.get("probabilityOTM"),
        open_interest=_to_int(payload.get("openInterest")),
        volume=_to_int(payload.get("volume")),
        raw=payload,
    )


@celery_app.task(name="app.tasks.process_covered_call_scan")
def process_covered_call_scan(job_id: str) -> dict[str, Any]:
    settings = get_settings()
    client = TradeStationClient(settings)
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    try:
        job = db.get(ScanJob, job_id)
        if job is None:
            raise RuntimeError(f"Scan job {job_id} was not found")

        job.status = ScanJobStatus.running.value
        job.started_at = now
        job.error = None
        db.execute(
            delete(CoveredCallOpportunity).where(
                CoveredCallOpportunity.job_id == job.id,
            )
        )
        db.commit()

        errors: list[str] = []
        for symbol in job.symbols:
            try:
                result = asyncio.run(
                    scan_covered_calls(
                        client,
                        symbol,
                        expiration_limit=job.expiration_limit,
                        strike_proximity=job.strike_proximity,
                    )
                )
                db.add_all(
                    _opportunity_from_payload(job.id, opportunity)
                    for opportunity in result["opportunities"]
                )
                job.completed_count += 1
            except Exception as error:  # Celery should persist symbol-level failures.
                job.failed_count += 1
                errors.append(f"{symbol}: {error}")
            db.commit()

        job.status = (
            ScanJobStatus.completed.value
            if job.completed_count > 0 or not errors
            else ScanJobStatus.failed.value
        )
        job.error = "\n".join(errors) if errors else None
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        return {
            "job_id": job.id,
            "status": job.status,
            "completed": job.completed_count,
            "failed": job.failed_count,
        }
    except Exception as error:
        job = db.get(ScanJob, job_id)
        if job is not None:
            job.status = ScanJobStatus.failed.value
            job.error = str(error)
            job.finished_at = datetime.now(timezone.utc)
            db.commit()
        raise
    finally:
        db.close()
