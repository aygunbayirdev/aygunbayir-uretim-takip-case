from pydantic import BaseModel


class ColumnInfoSchema(BaseModel):
    csv_name: str
    suggested_field: str | None
    sample_values: list[str]


class PreviewResponse(BaseModel):
    token: str
    encoding: str
    file_hash: str
    columns: list[ColumnInfoSchema]
    duplicate_batch_id: int | None = None  # None = temiz, int = daha önce yüklendi


class ColumnMappingItem(BaseModel):
    csv_column: str
    target_field: str  # orm field adı veya "ignore"


class ImportConfirmRequest(BaseModel):
    token: str
    mapping: list[ColumnMappingItem]


class ImportSummaryResponse(BaseModel):
    batch_id: int
    filename: str
    total_rows: int
    accepted_rows: int
    rejected_rows: int
    status: str
