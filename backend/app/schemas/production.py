from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Import — Preview & Confirm
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Import Batch
# ---------------------------------------------------------------------------

class ImportBatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    imported_at: datetime | None
    total_rows: int
    accepted_rows: int
    rejected_rows: int
    status: str


# ---------------------------------------------------------------------------
# Production Record
# ---------------------------------------------------------------------------

class ProductionRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    batch_id: int
    record_id: int
    csv_row_number: int | None
    tarih: date | None
    is_emri_no: str | None
    is_merkezi_no: str | None
    ismerkezi_adi: str | None
    is_istasyon_adi: str | None
    stok_adi: str | None
    vardiya: int | None
    availability: float | None
    performance: float | None
    quality: float | None
    oee: float | None
    calisma_suresi: float | None
    durus_suresi: float | None
    planli_durus: float | None
    plansiz_durus: float | None
    uretilen_miktar: int | None
    hatali_miktar: int | None
    validation_status: str
    is_sent: int
    updated_at: datetime | None


class PatchRecordRequest(BaseModel):
    """Manuel düzeltme — yalnızca gönderilen alanlar güncellenir."""
    tarih: date | None = None
    is_emri_no: str | None = None
    is_merkezi_no: str | None = None
    ismerkezi_adi: str | None = None
    is_istasyon_adi: str | None = None
    stok_adi: str | None = None
    vardiya: int | None = None
    availability: float | None = None
    performance: float | None = None
    quality: float | None = None
    oee: float | None = None
    calisma_suresi: float | None = None
    durus_suresi: float | None = None
    planli_durus: float | None = None
    plansiz_durus: float | None = None
    uretilen_miktar: int | None = None
    hatali_miktar: int | None = None
    correction_note: str | None = None  # audit trail için


class RecordsPageResponse(BaseModel):
    items: list[ProductionRecordResponse]
    total: int
    page: int
    page_size: int
