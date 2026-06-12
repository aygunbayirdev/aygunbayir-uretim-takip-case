from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_tables
from app.routers import import_router, records_router, validation_router, dashboard_router, submission_router

# Base.metadata'ya kayıt için model import'ları
import app.models.import_batch       # noqa: F401
import app.models.production_record  # noqa: F401
import app.models.validation_issue   # noqa: F401
import app.models.api_submission     # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="Üretim Performans Takip API",
    description="Magna otomotiv injection molding hattı OEE takip uygulaması.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:4173",   # Vite preview (npm run preview)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(import_router.router)
app.include_router(records_router.router)
app.include_router(validation_router.router)
app.include_router(dashboard_router.router)
app.include_router(submission_router.router)


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok"}
