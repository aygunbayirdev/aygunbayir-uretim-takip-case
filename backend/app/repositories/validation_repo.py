from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.production_record import ProductionRecord
from app.models.validation_issue import ValidationIssue


def get_issues(
    db: Session,
    record_id: int | None = None,
    resolved: bool | None = None,
    severity: str | None = None,
    rule_code: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[ValidationIssue], int]:
    query = db.query(ValidationIssue)
    if record_id is not None:
        query = query.filter(ValidationIssue.record_id == record_id)
    if resolved is not None:
        query = query.filter(ValidationIssue.resolved == (1 if resolved else 0))
    if severity:
        query = query.filter(ValidationIssue.severity == severity)
    if rule_code:
        query = query.filter(ValidationIssue.rule_code == rule_code)
    query = query.order_by(ValidationIssue.id.asc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_issue_by_id(db: Session, issue_id: int) -> ValidationIssue | None:
    return db.query(ValidationIssue).filter(ValidationIssue.id == issue_id).first()


def resolve_issue(
    db: Session,
    issue: ValidationIssue,
    resolved: bool,
    resolved_by: str | None = None,
    correction_note: str | None = None,
) -> ValidationIssue:
    issue.resolved = 1 if resolved else 0
    issue.resolved_at = datetime.utcnow() if resolved else None
    issue.resolved_by = resolved_by
    issue.correction_note = correction_note
    db.flush()

    _sync_record_status(db, issue.record_id)

    db.commit()
    db.refresh(issue)
    return issue


def _sync_record_status(db: Session, record_id: int) -> None:
    """Update ProductionRecord.validation_status based on remaining open issues."""
    open_issues = (
        db.query(ValidationIssue.severity)
        .filter(ValidationIssue.record_id == record_id, ValidationIssue.resolved == 0)
        .all()
    )
    severities = {row.severity for row in open_issues}

    if "error" in severities:
        new_status = "rejected"
    elif "warning" in severities:
        new_status = "warning"
    else:
        new_status = "clean"

    db.query(ProductionRecord).filter(ProductionRecord.id == record_id).update(
        {"validation_status": new_status}
    )


def get_summary(db: Session) -> dict:
    """Kural bazlı hata sayıları + genel istatistikler."""
    total = db.query(func.count(ValidationIssue.id)).scalar() or 0
    open_count = (
        db.query(func.count(ValidationIssue.id))
        .filter(ValidationIssue.resolved == 0)
        .scalar() or 0
    )
    error_count = (
        db.query(func.count(ValidationIssue.id))
        .filter(ValidationIssue.severity == "error", ValidationIssue.resolved == 0)
        .scalar() or 0
    )
    warning_count = (
        db.query(func.count(ValidationIssue.id))
        .filter(ValidationIssue.severity == "warning", ValidationIssue.resolved == 0)
        .scalar() or 0
    )

    by_rule_rows = (
        db.query(
            ValidationIssue.rule_code,
            ValidationIssue.severity,
            func.count(ValidationIssue.id).label("count"),
        )
        .filter(ValidationIssue.resolved == 0)
        .group_by(ValidationIssue.rule_code, ValidationIssue.severity)
        .order_by(ValidationIssue.rule_code.asc())
        .all()
    )

    return {
        "total_issues": total,
        "open_issues": open_count,
        "resolved_issues": total - open_count,
        "error_count": error_count,
        "warning_count": warning_count,
        "by_rule": [
            {"rule_code": r.rule_code, "severity": r.severity, "count": r.count}
            for r in by_rule_rows
        ],
    }
