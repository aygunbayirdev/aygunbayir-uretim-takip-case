from datetime import date, datetime
from sqlalchemy import Integer, Text, Float, Date, Timestamp
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ApiSubmission(Base):
    __tablename__ = "api_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_date: Mapped[date] = mapped_column(Date, nullable=False)
    shift: Mapped[int] = mapped_column(Integer, nullable=False)

    records_count: Mapped[int | None] = mapped_column(Integer)
    oe_value: Mapped[float | None] = mapped_column(Float)
    machine_count: Mapped[int | None] = mapped_column(Integer)
    total_units: Mapped[int | None] = mapped_column(Integer)

    http_status: Mapped[int | None] = mapped_column(Integer)
    response_body: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime | None] = mapped_column(Timestamp)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    status: Mapped[str] = mapped_column(Text, default="processing", nullable=False)
