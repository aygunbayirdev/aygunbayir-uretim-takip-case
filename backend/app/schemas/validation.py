from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ValidationIssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    record_id: int
    rule_code: str
    severity: str           # 'error' | 'warning'
    field_name: str | None
    message: str | None
    suggested_action: str | None
    resolved: int           # 0 | 1
    resolved_at: datetime | None
    resolved_by: str | None
    correction_note: str | None


class ResolveIssueRequest(BaseModel):
    """PATCH /api/validation/issues/{id} — issue'yu kapat veya reddet."""
    resolved: bool
    resolved_by: str | None = None
    correction_note: str | None = None


class RuleSummaryItem(BaseModel):
    rule_code: str
    severity: str
    count: int


class ValidationSummaryResponse(BaseModel):
    total_issues: int
    open_issues: int
    resolved_issues: int
    error_count: int
    warning_count: int
    by_rule: list[RuleSummaryItem]
