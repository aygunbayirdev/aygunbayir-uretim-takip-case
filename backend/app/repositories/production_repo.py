from dataclasses import dataclass, field
from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.production_record import ProductionRecord
from app.models.validation_issue import ValidationIssue


@dataclass
class RecordFilters:
    date_from: date | None = None
    date_to: date | None = None
    shift: list[int] | None = None
    station: str | None = None
    product: str | None = None
    oee_min: float | None = None
    oee_max: float | None = None
    validation_status: str | None = None
    issues_only: bool = False
    page: int = 1
    page_size: int = 50


def _apply_filters(query, filters: RecordFilters):
    if filters.date_from:
        query = query.filter(ProductionRecord.tarih >= filters.date_from)
    if filters.date_to:
        query = query.filter(ProductionRecord.tarih <= filters.date_to)
    if filters.shift:
        query = query.filter(ProductionRecord.vardiya.in_(filters.shift))
    if filters.station:
        query = query.filter(ProductionRecord.is_istasyon_adi.ilike(f"%{filters.station}%"))
    if filters.product:
        query = query.filter(ProductionRecord.stok_adi.ilike(f"%{filters.product}%"))
    if filters.oee_min is not None:
        query = query.filter(ProductionRecord.oee >= filters.oee_min)
    if filters.oee_max is not None:
        query = query.filter(ProductionRecord.oee <= filters.oee_max)
    if filters.validation_status:
        query = query.filter(ProductionRecord.validation_status == filters.validation_status)
    if filters.issues_only:
        query = query.filter(
            ProductionRecord.validation_status.in_(["warning", "rejected"])
        )
    return query


def get_records(db: Session, filters: RecordFilters) -> tuple[list[ProductionRecord], int]:
    query = db.query(ProductionRecord)
    query = _apply_filters(query, filters)
    total = query.count()
    items = (
        query.order_by(ProductionRecord.tarih.desc(), ProductionRecord.id.desc())
        .offset((filters.page - 1) * filters.page_size)
        .limit(filters.page_size)
        .all()
    )
    return items, total


def get_record_by_id(db: Session, record_id: int) -> ProductionRecord | None:
    return db.query(ProductionRecord).filter(ProductionRecord.id == record_id).first()


def patch_record(
    db: Session,
    record: ProductionRecord,
    updates: dict,
    correction_note: str | None = None,
) -> ProductionRecord:
    for field_name, value in updates.items():
        if hasattr(record, field_name) and value is not None:
            setattr(record, field_name, value)
    record.updated_at = datetime.utcnow()
    if correction_note:
        db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_records_for_export(db: Session, filters: RecordFilters) -> list[ProductionRecord]:
    """Filtreli tam liste — sayfalama yok, CSV export için."""
    query = db.query(ProductionRecord)
    query = _apply_filters(query, filters)
    return query.order_by(ProductionRecord.tarih.asc(), ProductionRecord.id.asc()).all()


def get_clean_unsent_records(db: Session) -> list[ProductionRecord]:
    """API'ye gönderilecek temiz, henüz gönderilmemiş kayıtlar."""
    return (
        db.query(ProductionRecord)
        .filter(
            ProductionRecord.validation_status == "clean",
            ProductionRecord.is_sent == 0,
        )
        .order_by(ProductionRecord.tarih.asc(), ProductionRecord.vardiya.asc())
        .all()
    )


def mark_records_sent(db: Session, record_ids: list[int]) -> None:
    db.query(ProductionRecord).filter(ProductionRecord.id.in_(record_ids)).update(
        {"is_sent": 1}, synchronize_session=False
    )
    db.commit()
