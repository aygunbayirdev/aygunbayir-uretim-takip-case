import asyncio
import time
from itertools import groupby
from statistics import mean

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.production_record import ProductionRecord
from app.repositories.production_repo import get_clean_unsent_records, mark_records_sent
from app.repositories.submission_repo import (
    create_pending,
    get_by_idempotency_key,
    increment_retry,
    update_result,
)

MAX_RETRIES = 3
RETRY_DELAYS = [1, 5, 30]        # saniye — exponential backoff

CIRCUIT_OPEN_THRESHOLD = 5       # ardışık hata sayısı
CIRCUIT_RESET_SECONDS = 60       # OPEN → HALF-OPEN bekleme süresi

# ---------------------------------------------------------------------------
# Circuit Breaker — basit in-memory state machine
# ---------------------------------------------------------------------------
_circuit_failures = 0
_circuit_opened_at: float | None = None
_circuit_state = "CLOSED"   # CLOSED | OPEN | HALF-OPEN


def _circuit_allow() -> bool:
    global _circuit_state, _circuit_failures, _circuit_opened_at

    if _circuit_state == "CLOSED":
        return True

    if _circuit_state == "OPEN":
        if _circuit_opened_at and time.time() - _circuit_opened_at >= CIRCUIT_RESET_SECONDS:
            _circuit_state = "HALF-OPEN"
            return True
        return False

    # HALF-OPEN: tek denemeye izin ver
    return True


def _circuit_success() -> None:
    global _circuit_state, _circuit_failures, _circuit_opened_at
    _circuit_failures = 0
    _circuit_opened_at = None
    _circuit_state = "CLOSED"


def _circuit_failure() -> None:
    global _circuit_state, _circuit_failures, _circuit_opened_at
    _circuit_failures += 1
    if _circuit_state == "HALF-OPEN" or _circuit_failures >= CIRCUIT_OPEN_THRESHOLD:
        _circuit_state = "OPEN"
        _circuit_opened_at = time.time()


# ---------------------------------------------------------------------------
# Payload builder
# ---------------------------------------------------------------------------
def build_submission_payload(records: list[ProductionRecord]) -> dict:
    oee_values = [r.oee for r in records if r.oee is not None]
    return {
        "oe_value": round(mean(oee_values), 2) if oee_values else 0.0,
        "machine_count": len({r.is_istasyon_adi for r in records if r.is_istasyon_adi}),
        "shift": records[0].vardiya,
        "total_production_units": sum(r.uretilen_miktar or 0 for r in records),
        "production_date": records[0].tarih.strftime("%Y-%m-%d"),
    }


# ---------------------------------------------------------------------------
# HTTP gönderim — retry + circuit breaker
# ---------------------------------------------------------------------------
async def send_with_retry(payload: dict, idempotency_key: str) -> dict:
    if not _circuit_allow():
        raise RuntimeError(
            f"Circuit breaker OPEN — ardışık {_circuit_failures} hata. "
            f"{CIRCUIT_RESET_SECONDS} saniye sonra tekrar deneyin."
        )

    last_error: Exception | None = None

    for attempt, delay in enumerate(RETRY_DELAYS):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    url=settings.API_ENDPOINT,
                    json=payload,
                    headers={
                        "X-Production-Key": settings.API_KEY,
                        "X-Idempotency-Key": idempotency_key,
                    },
                )

            if resp.status_code == 200:
                _circuit_success()
                return resp.json()

            if resp.status_code == 429:
                await asyncio.sleep(60)
                continue

            if resp.status_code == 413:
                _circuit_failure()
                raise ValueError("Payload 10 KB sınırını aştı — batch boyutunu küçült.")

            if resp.status_code in (401, 422):
                _circuit_failure()
                raise ValueError(f"Non-retryable HTTP {resp.status_code}: {resp.text}")

            # Diğer 4xx/5xx — retry
            last_error = RuntimeError(f"HTTP {resp.status_code}: {resp.text}")

        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            last_error = exc

        if attempt < len(RETRY_DELAYS) - 1:
            await asyncio.sleep(delay)

    _circuit_failure()
    raise RuntimeError(f"Max retries aşıldı: {last_error}")


# ---------------------------------------------------------------------------
# Background task — tüm temiz kayıtları gönder
# ---------------------------------------------------------------------------
async def send_all_clean(submission_id: int, db: Session) -> None:
    """
    FastAPI BackgroundTasks ile çağrılır.
    Temiz + gönderilmemiş kayıtları gün+vardiya bazında gruplar,
    her grup için ayrı API isteği atar.
    """
    from app.repositories.submission_repo import get_submission_by_id

    records = get_clean_unsent_records(db)
    if not records:
        _finalize(db, submission_id, http_status=0, response_body="Gönderilecek kayıt yok.", status="success")
        return

    # Gün + vardiya bazında grupla
    sorted_records = sorted(
        records,
        key=lambda r: (r.tarih, r.vardiya or 0),
    )

    sent_ids: list[int] = []
    last_error: str | None = None

    for (day, shift), group in groupby(sorted_records, key=lambda r: (r.tarih, r.vardiya)):
        group_list = list(group)
        idempotency_key = f"{day.strftime('%Y-%m-%d')}_{shift}"

        # Daha önce gönderilmişse atla
        if get_by_idempotency_key(db, idempotency_key):
            continue

        payload = build_submission_payload(group_list)

        # Her grup için ayrı submission kaydı oluştur
        sub = create_pending(db, submission_date=day, shift=shift or 0, idempotency_key=idempotency_key)

        try:
            response = await send_with_retry(payload, idempotency_key)
            update_result(
                db, sub,
                http_status=200,
                response_body=str(response),
                status="success",
                records_count=len(group_list),
                oe_value=payload["oe_value"],
                machine_count=payload["machine_count"],
                total_units=payload["total_production_units"],
            )
            sent_ids.extend(r.id for r in group_list)

        except Exception as exc:
            last_error = str(exc)
            update_result(db, sub, http_status=0, response_body=last_error, status="failed")

    if sent_ids:
        mark_records_sent(db, sent_ids)

    # Ana submission kaydını güncelle
    final_status = "failed" if last_error and not sent_ids else "success"
    _finalize(
        db, submission_id,
        http_status=200 if final_status == "success" else 0,
        response_body=last_error or f"{len(sent_ids)} kayıt gönderildi.",
        status=final_status,
        records_count=len(sent_ids),
    )


def _finalize(
    db: Session,
    submission_id: int,
    http_status: int,
    response_body: str,
    status: str,
    records_count: int = 0,
) -> None:
    from app.repositories.submission_repo import get_submission_by_id
    sub = get_submission_by_id(db, submission_id)
    if sub:
        update_result(
            db, sub,
            http_status=http_status,
            response_body=response_body,
            status=status,
            records_count=records_count,
        )
