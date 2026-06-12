from datetime import date

from pydantic import BaseModel


class KpiResponse(BaseModel):
    total_records: int
    clean_count: int
    warning_count: int
    rejected_count: int
    avg_oee: float | None
    avg_availability: float | None
    avg_performance: float | None
    avg_quality: float | None
    total_produced: int
    total_defective: int
    defect_rate: float | None      # %
    date_min: date | None
    date_max: date | None


class OeeTrendItem(BaseModel):
    date: str           # daily: "YYYY-MM-DD" | weekly: "YYYY-WNN" | monthly: "YYYY-MM"
    avg_oee: float | None
    avg_availability: float | None
    avg_performance: float | None
    avg_quality: float | None
    record_count: int


class ShiftStatItem(BaseModel):
    shift: int
    avg_oee: float | None
    avg_availability: float | None
    avg_performance: float | None
    avg_quality: float | None
    total_produced: int
    record_count: int


class StationStatItem(BaseModel):
    station: str
    avg_oee: float | None
    avg_availability: float | None
    record_count: int
    total_produced: int


class QualityDistItem(BaseModel):
    station: str
    total_produced: int
    total_defective: int
    defect_rate: float | None      # %
