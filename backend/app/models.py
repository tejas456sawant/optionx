from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ScanJobStatus(StrEnum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    status: Mapped[str] = mapped_column(String(20), default=ScanJobStatus.queued.value)
    source: Mapped[str] = mapped_column(String(20), default="manual")
    symbols: Mapped[list[str]] = mapped_column(JSON)
    requested_count: Mapped[int] = mapped_column(Integer, default=0)
    completed_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    strike_proximity: Mapped[int] = mapped_column(Integer, default=80)
    expiration_limit: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    opportunities: Mapped[list["CoveredCallOpportunity"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
    )


class CoveredCallOpportunity(Base):
    __tablename__ = "covered_call_opportunities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("scan_jobs.id", ondelete="CASCADE"))
    symbol: Mapped[str] = mapped_column(String(40), index=True)
    underlying: Mapped[str] = mapped_column(String(20), index=True)
    underlying_price: Mapped[float] = mapped_column(Float)
    expiration: Mapped[str] = mapped_column(String(40), index=True)
    expiration_type: Mapped[str] = mapped_column(String(30))
    days_to_expiration: Mapped[int] = mapped_column(Integer)
    strike: Mapped[float] = mapped_column(Float)
    premium: Mapped[float] = mapped_column(Float)
    net_debit: Mapped[float] = mapped_column(Float)
    capital_required: Mapped[float] = mapped_column(Float)
    breakeven: Mapped[float] = mapped_column(Float)
    downside_protection_percent: Mapped[float] = mapped_column(Float)
    max_profit: Mapped[float] = mapped_column(Float)
    max_profit_percent: Mapped[float] = mapped_column(Float)
    annualized_return_percent: Mapped[float] = mapped_column(Float, index=True)
    assigned_return_percent: Mapped[float] = mapped_column(Float)
    bid: Mapped[float | None] = mapped_column(Float)
    ask: Mapped[float | None] = mapped_column(Float)
    mid: Mapped[float | None] = mapped_column(Float)
    last: Mapped[float | None] = mapped_column(Float)
    delta: Mapped[float | None] = mapped_column(Float)
    probability_itm: Mapped[float | None] = mapped_column(Float)
    probability_otm: Mapped[float | None] = mapped_column(Float)
    open_interest: Mapped[int | None] = mapped_column(Integer)
    volume: Mapped[int | None] = mapped_column(Integer)
    raw: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    job: Mapped[ScanJob] = relationship(back_populates="opportunities")
