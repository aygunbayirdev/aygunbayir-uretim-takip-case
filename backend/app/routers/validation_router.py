import io

import openpyxl
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.validation_repo import (
    get_issue_by_id,
    get_issues,
    get_summary,
    resolve_issue,
)
from app.schemas.validation import (
    ResolveIssueRequest,
    ValidationIssueResponse,
    ValidationIssuesPageResponse,
    ValidationSummaryResponse,
)

router = APIRouter(prefix="/api/validation", tags=["validation"])


@router.get("/issues", response_model=ValidationIssuesPageResponse)
def list_issues(
    record_id: int | None = Query(None),
    resolved: bool | None = Query(None),
    severity: str | None = Query(None),
    rule_code: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> ValidationIssuesPageResponse:
    items, total = get_issues(
        db,
        record_id=record_id,
        resolved=resolved,
        severity=severity,
        rule_code=rule_code,
        page=page,
        page_size=page_size,
    )
    return ValidationIssuesPageResponse(
        items=[ValidationIssueResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/issues/{issue_id}", response_model=ValidationIssueResponse)
def get_issue(issue_id: int, db: Session = Depends(get_db)) -> ValidationIssueResponse:
    issue = get_issue_by_id(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue bulunamadı.")
    return ValidationIssueResponse.model_validate(issue)


@router.patch("/issues/{issue_id}", response_model=ValidationIssueResponse)
def patch_issue(
    issue_id: int,
    body: ResolveIssueRequest,
    db: Session = Depends(get_db),
) -> ValidationIssueResponse:
    issue = get_issue_by_id(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue bulunamadı.")
    issue = resolve_issue(
        db,
        issue,
        resolved=body.resolved,
        resolved_by=body.resolved_by,
        correction_note=body.correction_note,
    )
    return ValidationIssueResponse.model_validate(issue)


@router.get("/summary", response_model=ValidationSummaryResponse)
def summary(db: Session = Depends(get_db)) -> ValidationSummaryResponse:
    data = get_summary(db)
    return ValidationSummaryResponse(**data)


@router.get("/export")
def export_issues(db: Session = Depends(get_db)) -> StreamingResponse:
    """Açık validation issue'larını Excel dosyası olarak indir."""
    issues, _ = get_issues(db, resolved=False, page=1, page_size=100_000)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Validation Issues"

    headers = [
        "ID", "Kayıt ID", "Kural", "Seviye", "Alan", "Mesaj",
        "Önerilen Aksiyon", "Çözüldü", "Çözüm Notu",
    ]
    ws.append(headers)

    # Başlık satırı kalın
    from openpyxl.styles import Font
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for issue in issues:
        ws.append([
            issue.id,
            issue.record_id,
            issue.rule_code,
            issue.severity,
            issue.field_name or "",
            issue.message or "",
            issue.suggested_action or "",
            "Evet" if issue.resolved else "Hayır",
            issue.correction_note or "",
        ])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=validation_issues.xlsx"},
    )
