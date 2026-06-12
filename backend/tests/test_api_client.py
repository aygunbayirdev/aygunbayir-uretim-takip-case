"""
Unit tests for services/api_client.py.

send_with_retry is tested with httpx mock transport so no real HTTP calls are made.
Circuit breaker state is reset before each test to ensure isolation.
"""
import datetime
import pytest
import httpx

from app.models.production_record import ProductionRecord
from app.services import api_client
from app.services.api_client import (
    build_submission_payload,
    send_with_retry,
    _circuit_success,
    CIRCUIT_OPEN_THRESHOLD,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_production_record(**kwargs) -> ProductionRecord:
    defaults = dict(
        tarih=datetime.date(2024, 1, 15),
        is_istasyon_adi="ST-01",
        vardiya=1,
        oee=75.0,
        uretilen_miktar=500,
    )
    defaults.update(kwargs)
    return ProductionRecord(**defaults)


def reset_circuit():
    """Reset circuit breaker to CLOSED state between tests."""
    api_client._circuit_state = "CLOSED"
    api_client._circuit_failures = 0
    api_client._circuit_opened_at = None


@pytest.fixture(autouse=True)
def clean_circuit():
    reset_circuit()
    yield
    reset_circuit()


class MockTransport(httpx.MockTransport if hasattr(httpx, "MockTransport") else object):
    pass


def mock_client(status_code: int, body: str = "{}"):
    """Returns an httpx.AsyncClient that always responds with the given status."""
    def handler(request):
        return httpx.Response(status_code, text=body)
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


# ---------------------------------------------------------------------------
# build_submission_payload
# ---------------------------------------------------------------------------

def test_payload_oe_value_is_mean_oee():
    records = [
        make_production_record(oee=80.0),
        make_production_record(oee=60.0),
    ]
    payload = build_submission_payload(records)
    assert payload["oe_value"] == pytest.approx(70.0)


def test_payload_machine_count_is_distinct_stations():
    records = [
        make_production_record(is_istasyon_adi="ST-01"),
        make_production_record(is_istasyon_adi="ST-01"),
        make_production_record(is_istasyon_adi="ST-02"),
    ]
    payload = build_submission_payload(records)
    assert payload["machine_count"] == 2


def test_payload_total_production_units():
    records = [
        make_production_record(uretilen_miktar=300),
        make_production_record(uretilen_miktar=200),
    ]
    payload = build_submission_payload(records)
    assert payload["total_production_units"] == 500


def test_payload_shift_and_date():
    records = [make_production_record(vardiya=2, tarih=datetime.date(2024, 3, 10))]
    payload = build_submission_payload(records)
    assert payload["shift"] == 2
    assert payload["production_date"] == "2024-03-10"


def test_payload_oe_value_ignores_none_oee():
    records = [
        make_production_record(oee=None),
        make_production_record(oee=80.0),
    ]
    payload = build_submission_payload(records)
    assert payload["oe_value"] == pytest.approx(80.0)


def test_payload_oe_value_all_none_oee_is_zero():
    records = [make_production_record(oee=None)]
    payload = build_submission_payload(records)
    assert payload["oe_value"] == 0.0


def test_payload_oe_value_capped_at_100():
    records = [make_production_record(oee=115.0)]
    payload = build_submission_payload(records)
    assert payload["oe_value"] == 100.0


def test_payload_machine_count_minimum_1_when_all_stations_none():
    records = [make_production_record(is_istasyon_adi=None)]
    payload = build_submission_payload(records)
    assert payload["machine_count"] == 1


def test_payload_none_uretilen_treated_as_zero():
    records = [
        make_production_record(uretilen_miktar=None),
        make_production_record(uretilen_miktar=200),
    ]
    payload = build_submission_payload(records)
    assert payload["total_production_units"] == 200


# ---------------------------------------------------------------------------
# send_with_retry — HTTP 200 success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_send_success_returns_json(monkeypatch):
    async def mock_post(self_client, url, **kwargs):
        return httpx.Response(200, json={"success": True, "result": "ok"})

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    result = await send_with_retry({"shift": 1}, "2024-01-15_1")
    assert result == {"success": True, "result": "ok"}
    assert api_client._circuit_state == "CLOSED"
    assert api_client._circuit_failures == 0


@pytest.mark.asyncio
async def test_send_success_false_raises(monkeypatch):
    async def mock_post(self_client, url, **kwargs):
        return httpx.Response(200, json={"success": False, "message": "rejected"})

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    with pytest.raises(ValueError, match="success=false"):
        await send_with_retry({"shift": 1}, "key")


@pytest.mark.asyncio
async def test_send_no_idempotency_key_in_headers(monkeypatch):
    captured_headers = {}

    async def mock_post(self_client, url, **kwargs):
        captured_headers.update(kwargs.get("headers", {}))
        return httpx.Response(200, json={"success": True})

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)
    await send_with_retry({"shift": 1}, "key")

    assert "X-Idempotency-Key" not in captured_headers
    assert "X-Production-Key" in captured_headers


# ---------------------------------------------------------------------------
# send_with_retry — non-retryable errors (401, 422)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("status_code", [401, 422])
async def test_send_non_retryable_raises_immediately(status_code, monkeypatch):
    call_count = 0

    async def mock_post(self_client, url, **kwargs):
        nonlocal call_count
        call_count += 1
        return httpx.Response(status_code, text="error")

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    with pytest.raises(ValueError, match=f"Non-retryable HTTP {status_code}"):
        await send_with_retry({"shift": 1}, "key")

    assert call_count == 1   # no retry


# ---------------------------------------------------------------------------
# send_with_retry — 413 payload too large
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_send_413_raises_no_retry(monkeypatch):
    call_count = 0

    async def mock_post(self_client, url, **kwargs):
        nonlocal call_count
        call_count += 1
        return httpx.Response(413, text="too large")

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    with pytest.raises(ValueError, match="10 KB"):
        await send_with_retry({"shift": 1}, "key")

    assert call_count == 1


# ---------------------------------------------------------------------------
# send_with_retry — exhausted retries
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_send_max_retries_raises(monkeypatch):
    async def mock_post(self_client, url, **kwargs):
        return httpx.Response(500, text="server error")

    async def mock_sleep(_):
        pass

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)
    monkeypatch.setattr(api_client.asyncio, "sleep", mock_sleep)

    with pytest.raises(RuntimeError, match="Max retries"):
        await send_with_retry({"shift": 1}, "key")


# ---------------------------------------------------------------------------
# Circuit breaker
# ---------------------------------------------------------------------------

def test_circuit_closed_by_default():
    assert api_client._circuit_state == "CLOSED"


def test_circuit_opens_after_threshold_failures():
    for _ in range(CIRCUIT_OPEN_THRESHOLD):
        api_client._circuit_failure()
    assert api_client._circuit_state == "OPEN"


def test_circuit_failure_count_increments():
    api_client._circuit_failure()
    api_client._circuit_failure()
    assert api_client._circuit_failures == 2


def test_circuit_success_resets_to_closed():
    for _ in range(CIRCUIT_OPEN_THRESHOLD):
        api_client._circuit_failure()
    assert api_client._circuit_state == "OPEN"
    _circuit_success()
    assert api_client._circuit_state == "CLOSED"
    assert api_client._circuit_failures == 0


@pytest.mark.asyncio
async def test_send_raises_when_circuit_open(monkeypatch):
    # Force circuit open
    for _ in range(CIRCUIT_OPEN_THRESHOLD):
        api_client._circuit_failure()

    with pytest.raises(RuntimeError, match="Circuit breaker OPEN"):
        await send_with_retry({"shift": 1}, "key")


def test_circuit_half_open_after_reset_time(monkeypatch):
    import time
    for _ in range(CIRCUIT_OPEN_THRESHOLD):
        api_client._circuit_failure()
    assert api_client._circuit_state == "OPEN"

    # Simulate elapsed reset time
    api_client._circuit_opened_at = time.time() - api_client.CIRCUIT_RESET_SECONDS - 1
    allowed = api_client._circuit_allow()
    assert allowed
    assert api_client._circuit_state == "HALF-OPEN"
