from pydantic import BaseModel, Field


class CoveredCallScanRequest(BaseModel):
    symbols: list[str] = Field(..., min_length=1, max_length=250)
    strike_proximity: int = Field(80, ge=1, le=250)
    expiration_limit: int = Field(
        0,
        ge=0,
        le=100,
        description="0 scans every monthly/LEAPS-style expiration.",
    )


class CronScanRequest(BaseModel):
    symbols: list[str] | None = Field(default=None, max_length=250)
    strike_proximity: int = Field(80, ge=1, le=250)
    expiration_limit: int = Field(0, ge=0, le=100)
