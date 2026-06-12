import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.validation_issue import ValidationIssue
from app.repositories.production_repo import (
    RecordFilters,
    get_record_by_id,
    get_records,
    get_records_for_export,
    patch_record,
)
from app.schemas.production import (
    PatchRecordRequest,
    ProductionRecordResponse,
    RecordsPageResponse,
)

router = APIRouter(prefix="/api/records", tags=["records"])

EXPORT_FIELDS = [
    "id", "tarih", "is_emri_no", "is_istasyon_adi", "stok_adi", "vardiya",
    "availability", "performance", "quality", "oee",
    "calisma_suresi", "durus_suresi", "uretilen_miktar", "hatali_miktar",
    "validation_status", "is_sent",
]


@router.get("", response_model=RecordsPageResponse)
def list_records(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    shift: int | None = Query(None),
    station: str | None = Query(None),
    product: str | None = Query(None),
    oee_min: float | None = Query(None),
    oee_max: float | None = Query(None),
    validation_status: str | None = Query(None),
    issues_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> RecordsPageResponse:
    filters = RecordFilters(
        date_from=date_from,
        date_to=date_to,
        shift=shift,
        station=station,
        product=product,
        oee_min=oee_min,
        oee_max=oee_max,
        validation_status=validation_status,
        issues_only=issues_only,
        page=page,
        page_size=page_size,
    )
    items, total = get_records(db, filters)
    return RecordsPageResponse(
        items=[ProductionRecordResponse.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/export")
def export_records(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    shift: int | None = Query(None),
    station: str | None = Query(None),
    product: str | None = Query(None),
    oee_min: float | None = Query(None),
    oee_max: float | None = Query(None),
    validation_status: str | None = Query(None),
    issues_only: bool = Query(False),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    filters = RecordFilters(
        date_from=date_from,
        date_to=date_to,
        shift=shift,
        station=station,
        product=product,
        oee_min=oee_min,
        oee_max=oee_max,
        validation_status=validation_status,
        issues_only=issues_only,
    )
    records = get_records_for_export(db, filters)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=EXPORT_FIELDS, extrasaction="ignore")
    writer.writeheader()
    for r in records:
        writer.writerow({f: getattr(r, f, "") for f in EXPORT_FIELDS})

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=records_export.csv"},
    )


@router.get("/{record_id}", response_model=ProductionRecordResponse)
def get_record(record_id: int, db: Session = Depends(get_db)) -> ProductionRecordResponse:
    record = get_record_by_id(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
    return ProductionRecordResponse.model_validate(record)


@router.patch("/{record_id}", response_model=ProductionRecordResponse)
def update_record(
    record_id: int,
    body: PatchRecordRequest,
    db: Session = Depends(get_db),
) -> ProductionRecordResponse:
    record = get_record_by_id(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")

    updates = body.model_dump(exclude_none=True, exclude={"correction_note"})
    record = patch_record(db, record, updates, correction_note=body.correction_note)

    # Audit trail — correction_note varsa ValidationIssue'ya yaz
    if body.correction_note:
        db.add(ValidationIssue(
            record_id=record.id,
            rule_code="MANUAL",
            severity="warning",
            field_name=",".join(updates.keys()) or None,
            message=f"Manuel düzeltme: {body.correction_note}",
            suggested_action="warn",
            resolved=1,
        ))
        db.commit()

    return ProductionRecordResponse.model_validate(record)
