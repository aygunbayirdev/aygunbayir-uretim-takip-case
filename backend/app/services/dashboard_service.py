from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.production_record import ProductionRecord
from app.schemas.dashboard import (
    KpiResponse,
    OeeTrendItem,
    QualityDistItem,
    ShiftStatItem,
    StationStatItem,
)

# Reddedilen kayıtlar OEE hesaplarına dahil edilmez
_VALID_STATUSES = ("clean", "warning")


def _base_query(db: Session):
    return db.query(ProductionRecord).filter(
        ProductionRecord.validation_status.in_(_VALID_STATUSES)
    )


def _round2(val) -> float | None:
    return round(float(val), 2) if val is not None else None


def get_kpi(db: Session) -> KpiResponse:
    total = db.query(func.count(ProductionRecord.id)).scalar() or 0
    clean = db.query(func.count(ProductionRecord.id)).filter(ProductionRecord.validation_status == "clean").scalar() or 0
    warning = db.query(func.count(ProductionRecord.id)).filter(ProductionRecord.validation_status == "warning").scalar() or 0
    rejected = db.query(func.count(ProductionRecord.id)).filter(ProductionRecord.validation_status == "rejected").scalar() or 0

    agg = db.query(
        func.avg(ProductionRecord.oee),
        func.avg(ProductionRecord.availability),
        func.avg(ProductionRecord.performance),
        func.avg(ProductionRecord.quality),
        func.sum(ProductionRecord.uretilen_miktar),
        func.sum(ProductionRecord.hatali_miktar),
        func.min(ProductionRecord.tarih),
        func.max(ProductionRecord.tarih),
    ).filter(ProductionRecord.validation_status.in_(_VALID_STATUSES)).one()

    total_produced = int(agg[4] or 0)
    total_defective = int(agg[5] or 0)
    defect_rate = _round2(total_defective / total_produced * 100) if total_produced > 0 else None

    return KpiResponse(
        total_records=total,
        clean_count=clean,
        warning_count=warning,
        rejected_count=rejected,
        avg_oee=_round2(agg[0]),
        avg_availability=_round2(agg[1]),
        avg_performance=_round2(agg[2]),
        avg_quality=_round2(agg[3]),
        total_produced=total_produced,
        total_defective=total_defective,
        defect_rate=defect_rate,
        date_min=agg[6],
        date_max=agg[7],
    )


def get_oee_trend(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[OeeTrendItem]:
    query = db.query(
        ProductionRecord.tarih,
        func.avg(ProductionRecord.oee).label("avg_oee"),
        func.avg(ProductionRecord.availability).label("avg_availability"),
        func.avg(ProductionRecord.performance).label("avg_performance"),
        func.avg(ProductionRecord.quality).label("avg_quality"),
        func.count(ProductionRecord.id).label("record_count"),
    ).filter(ProductionRecord.validation_status.in_(_VALID_STATUSES))

    if date_from:
        query = query.filter(ProductionRecord.tarih >= date_from)
    if date_to:
        query = query.filter(ProductionRecord.tarih <= date_to)

    rows = query.group_by(ProductionRecord.tarih).order_by(ProductionRecord.tarih.asc()).all()

    return [
        OeeTrendItem(
            date=r.tarih,
            avg_oee=_round2(r.avg_oee),
            avg_availability=_round2(r.avg_availability),
            avg_performance=_round2(r.avg_performance),
            avg_quality=_round2(r.avg_quality),
            record_count=r.record_count,
        )
        for r in rows
    ]


def get_by_shift(db: Session) -> list[ShiftStatItem]:
    rows = db.query(
        ProductionRecord.vardiya,
        func.avg(ProductionRecord.oee).label("avg_oee"),
        func.avg(ProductionRecord.availability).label("avg_availability"),
        func.avg(ProductionRecord.performance).label("avg_performance"),
        func.avg(ProductionRecord.quality).label("avg_quality"),
        func.sum(ProductionRecord.uretilen_miktar).label("total_produced"),
        func.count(ProductionRecord.id).label("record_count"),
    ).filter(
        ProductionRecord.validation_status.in_(_VALID_STATUSES),
        ProductionRecord.vardiya.isnot(None),
    ).group_by(ProductionRecord.vardiya).order_by(ProductionRecord.vardiya.asc()).all()

    return [
        ShiftStatItem(
            shift=r.vardiya,
            avg_oee=_round2(r.avg_oee),
            avg_availability=_round2(r.avg_availability),
            avg_performance=_round2(r.avg_performance),
            avg_quality=_round2(r.avg_quality),
            total_produced=int(r.total_produced or 0),
            record_count=r.record_count,
        )
        for r in rows
    ]


def get_by_station(db: Session) -> list[StationStatItem]:
    rows = db.query(
        ProductionRecord.is_istasyon_adi,
        func.avg(ProductionRecord.oee).label("avg_oee"),
        func.avg(ProductionRecord.availability).label("avg_availability"),
        func.sum(ProductionRecord.uretilen_miktar).label("total_produced"),
        func.count(ProductionRecord.id).label("record_count"),
    ).filter(
        ProductionRecord.validation_status.in_(_VALID_STATUSES),
        ProductionRecord.is_istasyon_adi.isnot(None),
    ).group_by(ProductionRecord.is_istasyon_adi).order_by(func.avg(ProductionRecord.oee).desc()).all()

    return [
        StationStatItem(
            station=r.is_istasyon_adi,
            avg_oee=_round2(r.avg_oee),
            avg_availability=_round2(r.avg_availability),
            total_produced=int(r.total_produced or 0),
            record_count=r.record_count,
        )
        for r in rows
    ]


def get_quality_dist(db: Session) -> list[QualityDistItem]:
    rows = db.query(
        ProductionRecord.is_istasyon_adi,
        func.sum(ProductionRecord.uretilen_miktar).label("total_produced"),
        func.sum(ProductionRecord.hatali_miktar).label("total_defective"),
    ).filter(
        ProductionRecord.validation_status.in_(_VALID_STATUSES),
        ProductionRecord.is_istasyon_adi.isnot(None),
    ).group_by(ProductionRecord.is_istasyon_adi).order_by(func.sum(ProductionRecord.hatali_miktar).desc()).all()

    result = []
    for r in rows:
        produced = int(r.total_produced or 0)
        defective = int(r.total_defective or 0)
        defect_rate = _round2(defective / produced * 100) if produced > 0 else None
        result.append(QualityDistItem(
            station=r.is_istasyon_adi,
            total_produced=produced,
            total_defective=defective,
            defect_rate=defect_rate,
        ))
    return result
