from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_tables
import app.models.import_batch  # noqa: F401
import app.models.production_record  # noqa: F401
import app.models.validation_issue  # noqa: F401
import app.models.api_submission  # noqa: F401

app = FastAPI(
    title="Üretim Performans Takip API",
    description="Magna otomotiv injection molding hattı OEE takip uygulaması.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_tables()


@app.get("/health")
def health_check():
    return {"status": "ok"}
