from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.submission_repo import (
    get_submission_by_id,
    get_submissions,
    create_pending,
    increment_retry,
)
from app.schemas.submission import SendSubmissionsResponse, SubmissionResponse, SubmissionsPageResponse
from app.services.api_client import send_all_clean, _circuit_state

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


@router.post("/send", response_model=SendSubmissionsResponse)
async def send_submissions(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> SendSubmissionsResponse:
    if _circuit_state == "OPEN":
        raise HTTPException(
            status_code=503,
            detail="API bağlantısı geçici olarak kapalı (circuit breaker OPEN). Lütfen bekleyin.",
        )

    # Ana koordinatör submission kaydı — polling için
    submission = create_pending(
        db,
        submission_date=date.today(),
        shift=0,                          # 0 = tüm vardiyalar
        idempotency_key=f"batch_{date.today().isoformat()}_{id(background_tasks)}",
    )

    background_tasks.add_task(send_all_clean, submission.id)

    return SendSubmissionsResponse(submission_id=submission.id, status="processing")


@router.get("", response_model=SubmissionsPageResponse)
def list_submissions(db: Session = Depends(get_db)) -> SubmissionsPageResponse:
    items = get_submissions(db)
    return SubmissionsPageResponse(
        items=[SubmissionResponse.model_validate(s) for s in items],
        total=len(items),
    )


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(submission_id: int, db: Session = Depends(get_db)) -> SubmissionResponse:
    sub = get_submission_by_id(db, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Gönderim bulunamadı.")
    return SubmissionResponse.model_validate(sub)


@router.post("/{submission_id}/retry", response_model=SendSubmissionsResponse)
async def retry_submission(
    submission_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> SendSubmissionsResponse:
    sub = get_submission_by_id(db, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Gönderim bulunamadı.")
    if sub.status not in ("failed",):
        raise HTTPException(status_code=400, detail="Sadece başarısız gönderimleri yeniden deneyebilirsiniz.")

    increment_retry(db, sub)
    background_tasks.add_task(send_all_clean, sub.id)

    return SendSubmissionsResponse(submission_id=sub.id, status="processing")
