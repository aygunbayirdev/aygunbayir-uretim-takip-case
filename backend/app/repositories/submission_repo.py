from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.api_submission import ApiSubmission


def get_submissions(db: Session) -> list[ApiSubmission]:
    return (
        db.query(ApiSubmission)
        .filter(ApiSubmission.shift != 0)
        .order_by(ApiSubmission.submitted_at.desc().nullslast())
        .all()
    )


def get_submission_by_id(db: Session, submission_id: int) -> ApiSubmission | None:
    return db.query(ApiSubmission).filter(ApiSubmission.id == submission_id).first()


def get_by_idempotency_key(db: Session, key: str) -> ApiSubmission | None:
    return db.query(ApiSubmission).filter(ApiSubmission.idempotency_key == key).first()


def create_pending(
    db: Session,
    submission_date: date,
    shift: int,
    idempotency_key: str,
) -> ApiSubmission:
    submission = ApiSubmission(
        submission_date=submission_date,
        shift=shift,
        idempotency_key=idempotency_key,
        status="processing",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def update_result(
    db: Session,
    submission: ApiSubmission,
    http_status: int,
    response_body: str,
    status: str,
    records_count: int | None = None,
    oe_value: float | None = None,
    machine_count: int | None = None,
    total_units: int | None = None,
) -> ApiSubmission:
    submission.http_status = http_status
    submission.response_body = response_body
    submission.status = status
    submission.submitted_at = datetime.utcnow()
    if records_count is not None:
        submission.records_count = records_count
    if oe_value is not None:
        submission.oe_value = oe_value
    if machine_count is not None:
        submission.machine_count = machine_count
    if total_units is not None:
        submission.total_units = total_units
    db.commit()
    db.refresh(submission)
    return submission


def increment_retry(db: Session, submission: ApiSubmission) -> ApiSubmission:
    submission.retry_count += 1
    db.commit()
    db.refresh(submission)
    return submission
