from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class SubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    submission_date: date
    shift: int
    records_count: int | None
    oe_value: float | None
    machine_count: int | None
    total_units: int | None
    http_status: int | None
    submitted_at: datetime | None
    retry_count: int
    idempotency_key: str
    status: str             # 'processing' | 'success' | 'failed'


class SendSubmissionsResponse(BaseModel):
    submission_id: int
    status: str             # 'processing' — arka planda çalışır


class SubmissionsPageResponse(BaseModel):
    items: list[SubmissionResponse]
    total: int
