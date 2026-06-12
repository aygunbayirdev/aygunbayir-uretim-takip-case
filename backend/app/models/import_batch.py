from datetime import datetime
from sqlalchemy import DateTime, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    imported_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    total_rows: Mapped[int | None] = mapped_column(Integer)
    accepted_rows: Mapped[int | None] = mapped_column(Integer)
    rejected_rows: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(Text, default="processing", nullable=False)
    file_hash: Mapped[str | None] = mapped_column(Text, unique=True)
