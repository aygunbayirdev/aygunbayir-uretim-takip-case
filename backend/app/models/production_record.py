from datetime import date, datetime
from sqlalchemy import Integer, Text, Float, Date, Timestamp, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProductionRecord(Base):
    __tablename__ = "production_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(Integer, ForeignKey("import_batches.id"), nullable=False)
    record_id: Mapped[int] = mapped_column(Integer, nullable=False)
    csv_row_number: Mapped[int | None] = mapped_column(Integer)

    tarih: Mapped[date] = mapped_column(Date, nullable=False)
    is_emri_no: Mapped[str | None] = mapped_column(Text)
    is_merkezi_no: Mapped[str | None] = mapped_column(Text)
    ismerkezi_adi: Mapped[str | None] = mapped_column(Text)
    is_istasyon_adi: Mapped[str | None] = mapped_column(Text)
    stok_adi: Mapped[str | None] = mapped_column(Text)
    vardiya: Mapped[int | None] = mapped_column(Integer)

    availability: Mapped[float | None] = mapped_column(Float)
    performance: Mapped[float | None] = mapped_column(Float)
    quality: Mapped[float | None] = mapped_column(Float)
    oee: Mapped[float | None] = mapped_column(Float)

    calisma_suresi: Mapped[float | None] = mapped_column(Float)
    durus_suresi: Mapped[float | None] = mapped_column(Float)
    planli_durus: Mapped[float | None] = mapped_column(Float)
    plansiz_durus: Mapped[float | None] = mapped_column(Float)

    uretilen_miktar: Mapped[int | None] = mapped_column(Integer)
    hatali_miktar: Mapped[int | None] = mapped_column(Integer)

    validation_status: Mapped[str] = mapped_column(Text, default="pending", nullable=False)
    is_sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        Timestamp, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        Timestamp, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    batch = relationship("ImportBatch", backref="records")
    validation_issues = relationship("ValidationIssue", backref="record", cascade="all, delete-orphan")
