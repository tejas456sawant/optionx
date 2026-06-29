from typing import Any

import httpx
from celery.exceptions import CeleryError
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.covered_calls import scan_covered_calls
from app.database import get_db
from app.dependencies import tradestation_client
from app.jobs import (
    count_job_opportunities,
    create_scan_job,
    get_job_results,
    normalize_symbols,
    serialize_job,
)
from app.models import ScanJob
from app.schemas import CoveredCallScanRequest, CronScanRequest
from app.tasks import process_covered_call_scan


router = APIRouter()
settings = get_settings()


@router.get("/options/expirations")
async def print_option_expirations(
    symbol: str = Query(..., min_length=1, description="Underlying ticker, e.g. NVDA"),
) -> dict[str, Any]:
    underlying = symbol.strip().upper()
    try:
        expirations = await tradestation_client.get_option_expirations(underlying)
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except httpx.HTTPStatusError as error:
        detail = error.response.text
        raise HTTPException(status_code=error.response.status_code, detail=detail) from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    print(f"TradeStation option expirations for {underlying}: {expirations}", flush=True)
    return {"symbol": underlying, "logged": True}


@router.get("/covered-calls")
async def covered_calls(
    symbol: str = Query(..., min_length=1, description="Underlying ticker, e.g. NVDA"),
    expiration_limit: int = Query(
        0,
        ge=0,
        le=100,
        description="0 scans every monthly/LEAPS-style expiration returned by TradeStation.",
    ),
    strike_proximity: int = Query(
        80,
        ge=1,
        le=250,
        description="Number of call strikes above and below the current stock price.",
    ),
) -> dict[str, Any]:
    underlying = symbol.strip().upper()
    try:
        return await scan_covered_calls(
            tradestation_client,
            underlying,
            expiration_limit=expiration_limit,
            strike_proximity=strike_proximity,
        )
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except httpx.HTTPStatusError as error:
        detail = error.response.text
        raise HTTPException(status_code=error.response.status_code, detail=detail) from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/covered-calls/jobs", status_code=202)
async def create_covered_call_job(
    payload: CoveredCallScanRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    symbols = normalize_symbols(payload.symbols)
    if not symbols:
        raise HTTPException(status_code=400, detail="Provide at least one symbol.")

    job = create_scan_job(
        db,
        symbols=symbols,
        source="manual",
        strike_proximity=payload.strike_proximity,
        expiration_limit=payload.expiration_limit,
    )
    try:
        process_covered_call_scan.delay(job.id)
    except CeleryError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return serialize_job(job, opportunity_count=0)


@router.get("/covered-calls/jobs")
async def list_covered_call_jobs(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    jobs = db.scalars(
        select(ScanJob).order_by(ScanJob.created_at.desc()).limit(limit)
    ).all()
    return {
        "jobs": [
            serialize_job(job, opportunity_count=count_job_opportunities(db, job.id))
            for job in jobs
        ]
    }


@router.get("/covered-calls/jobs/{job_id}")
async def get_covered_call_job(
    job_id: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    job = db.get(ScanJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Scan job not found.")
    return serialize_job(
        job,
        opportunity_count=count_job_opportunities(db, job.id),
    )


@router.delete("/covered-calls/jobs/{job_id}")
async def delete_covered_call_job(
    job_id: str,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    job = db.get(ScanJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Scan job not found.")
    db.delete(job)
    db.commit()
    return {"id": job_id, "status": "deleted"}


@router.get("/covered-calls/jobs/{job_id}/results")
async def get_covered_call_job_results(
    job_id: str,
    limit: int = Query(500, ge=1, le=5000),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    job = db.get(ScanJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Scan job not found.")
    return {
        "job": serialize_job(
            job,
            opportunity_count=count_job_opportunities(db, job.id),
        ),
        "opportunities": get_job_results(db, job_id, limit=limit),
    }


def _verify_cron_token(token: str | None) -> None:
    if settings.cron_secret and token != settings.cron_secret:
        raise HTTPException(status_code=401, detail="Invalid cron token.")


def _enqueue_cron_job(
    symbols: list[str],
    strike_proximity: int,
    expiration_limit: int,
    db: Session,
) -> dict[str, Any]:
    normalized = normalize_symbols(symbols)
    if not normalized:
        raise HTTPException(
            status_code=400,
            detail="No cron symbols configured. Set COVERED_CALL_SYMBOLS or pass symbols.",
        )
    job = create_scan_job(
        db,
        symbols=normalized,
        source="cron",
        strike_proximity=strike_proximity,
        expiration_limit=expiration_limit,
    )
    try:
        process_covered_call_scan.delay(job.id)
    except CeleryError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return serialize_job(job, opportunity_count=0)


@router.get("/cron/covered-calls", status_code=202)
async def cron_covered_calls_get(
    token: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _verify_cron_token(token)
    return _enqueue_cron_job(
        settings.covered_call_symbols,
        strike_proximity=80,
        expiration_limit=0,
        db=db,
    )


@router.post("/cron/covered-calls", status_code=202)
async def cron_covered_calls_post(
    payload: CronScanRequest,
    token: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _verify_cron_token(token)
    return _enqueue_cron_job(
        payload.symbols or settings.covered_call_symbols,
        strike_proximity=payload.strike_proximity,
        expiration_limit=payload.expiration_limit,
        db=db,
    )
