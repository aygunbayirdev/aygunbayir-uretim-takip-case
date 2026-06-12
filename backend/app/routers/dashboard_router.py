from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.dashboard import (
    KpiResponse,
    OeeTrendItem,
    QualityDistItem,
    ShiftStatItem,
    StationStatItem,
)
from app.services.dashboard_service import (
    get_by_shift,
    get_by_station,
    get_kpi,
    get_oee_trend,
    get_quality_dist,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/kpi", response_model=KpiResponse)
def kpi(db: Session = Depends(get_db)) -> KpiResponse:
    return get_kpi(db)


@router.get("/oee-trend", response_model=list[OeeTrendItem])
def oee_trend(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    granularity: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    db: Session = Depends(get_db),
) -> list[OeeTrendItem]:
    return get_oee_trend(db, date_from=date_from, date_to=date_to, granularity=granularity)


@router.get("/by-shift", response_model=list[ShiftStatItem])
def by_shift(db: Session = Depends(get_db)) -> list[ShiftStatItem]:
    return get_by_shift(db)


@router.get("/by-station", response_model=list[StationStatItem])
def by_station(db: Session = Depends(get_db)) -> list[StationStatItem]:
    return get_by_station(db)


@router.get("/quality-dist", response_model=list[QualityDistItem])
def quality_dist(db: Session = Depends(get_db)) -> list[QualityDistItem]:
    return get_quality_dist(db)
