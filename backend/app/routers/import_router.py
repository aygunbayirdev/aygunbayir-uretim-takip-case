from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.import_batch import ImportBatch
from app.schemas.production import (
    BatchProgressResponse,
    ColumnInfoSchema,
    ImportBatchResponse,
    ImportConfirmRequest,
    PreviewResponse,
)
from app.services.csv_parser import get_temp_file, parse_preview
from app.services.import_service import run_import_background

router = APIRouter(prefix="/api/import", tags=["import"])


@router.get("/batches", response_model=list[ImportBatchResponse])
def list_batches(db: Session = Depends(get_db)) -> list[ImportBatchResponse]:
    batches = (
        db.query(ImportBatch)
        .order_by(ImportBatch.imported_at.desc())
        .all()
    )
    return [ImportBatchResponse.model_validate(b) for b in batches]


@router.get("/batches/{batch_id}/progress", response_model=BatchProgressResponse)
def get_batch_progress(batch_id: int, db: Session = Depends(get_db)) -> BatchProgressResponse:
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch bulunamadı.")
    total = batch.total_rows or 0
    processed = batch.processed_rows or 0
    if total > 0:
        percentage = min(round(processed / total * 100), 100)
    else:
        percentage = 100 if batch.status == "completed" else 0
    return BatchProgressResponse(
        batch_id=batch_id,
        status=batch.status,
        total_rows=total,
        processed_rows=processed,
        percentage=percentage,
        accepted_rows=batch.accepted_rows if batch.status == "completed" else None,
        rejected_rows=batch.rejected_rows if batch.status == "completed" else None,
    )


@router.get("/batches/{batch_id}", response_model=ImportBatchResponse)
def get_batch(batch_id: int, db: Session = Depends(get_db)) -> ImportBatchResponse:
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch bulunamadı.")
    return ImportBatchResponse.model_validate(batch)


@router.post("/preview", response_model=PreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> PreviewResponse:
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Dosya boş.")

    result = parse_preview(file_bytes, file.filename or "upload.csv")

    # Erken duplicate uyarısı — kullanıcı mapping UI'ına gelmeden görsün
    existing = db.query(ImportBatch).filter(ImportBatch.file_hash == result.file_hash).first()

    return PreviewResponse(
        token=result.token,
        encoding=result.encoding,
        file_hash=result.file_hash,
        duplicate_batch_id=existing.id if existing else None,
        sample_rows=result.sample_rows,
        columns=[
            ColumnInfoSchema(
                csv_name=col.csv_name,
                suggested_field=col.suggested_field,
                sample_values=col.sample_values,
            )
            for col in result.columns
        ],
    )


@router.post("/confirm", response_model=ImportBatchResponse)
async def confirm_import(
    request: ImportConfirmRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> ImportBatchResponse:
    mapping = {item.csv_column: item.target_field for item in request.mapping}

    temp = get_temp_file(request.token)
    if not temp:
        raise HTTPException(status_code=400, detail="Geçersiz token veya oturum süresi dolmuş.")

    _, filename, file_hash = temp

    existing = db.query(ImportBatch).filter(ImportBatch.file_hash == file_hash).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Bu dosya daha önce yüklendi (Batch ID: {existing.id}).",
        )

    batch = ImportBatch(
        filename=filename,
        total_rows=0,
        accepted_rows=0,
        rejected_rows=0,
        status="processing",
        file_hash=file_hash,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    background_tasks.add_task(run_import_background, batch.id, request.token, mapping)
    return ImportBatchResponse.model_validate(batch)
