from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.import_batch import ImportBatch
from app.schemas.production import (
    ColumnInfoSchema,
    ImportBatchResponse,
    ImportConfirmRequest,
    PreviewResponse,
)
from app.services.csv_parser import parse_preview
from app.services.import_service import import_csv

router = APIRouter(prefix="/api/import", tags=["import"])


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
def confirm_import(
    request: ImportConfirmRequest,
    db: Session = Depends(get_db),
) -> ImportBatchResponse:
    mapping = {item.csv_column: item.target_field for item in request.mapping}

    try:
        batch = import_csv(token=request.token, mapping=mapping, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ImportBatchResponse.model_validate(batch)
