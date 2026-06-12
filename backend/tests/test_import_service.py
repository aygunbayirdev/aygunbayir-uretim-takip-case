"""
Unit tests for import_service.py — pure functions only (no DB required).
DB-dependent flows (cross-batch duplicate, import_csv) are not covered here
because they require a live Session; integration tests would cover those.
"""
import pytest

from app.services.import_service import (
    _business_key,
    _find_infile_duplicates,
    _safe_float,
    _safe_int,
)


# ---------------------------------------------------------------------------
# _safe_int
# ---------------------------------------------------------------------------

def test_safe_int_normal():
    assert _safe_int("42") == 42


def test_safe_int_float_string():
    assert _safe_int("3.0") == 3


def test_safe_int_none():
    assert _safe_int(None) is None


def test_safe_int_empty_string():
    assert _safe_int("") is None


def test_safe_int_whitespace():
    assert _safe_int("   ") is None


def test_safe_int_non_numeric():
    assert _safe_int("abc") is None


# ---------------------------------------------------------------------------
# _safe_float
# ---------------------------------------------------------------------------

def test_safe_float_normal():
    assert _safe_float("3.14") == pytest.approx(3.14)


def test_safe_float_integer_string():
    assert _safe_float("100") == pytest.approx(100.0)


def test_safe_float_none():
    assert _safe_float(None) is None


def test_safe_float_empty():
    assert _safe_float("") is None


def test_safe_float_non_numeric():
    assert _safe_float("xyz") is None


# ---------------------------------------------------------------------------
# _business_key
# ---------------------------------------------------------------------------

def _row(tarih="2024-01-15", is_emri_no="3025678325", vardiya="1", is_istasyon_adi="ST-01"):
    return {
        "tarih": tarih,
        "is_emri_no": is_emri_no,
        "vardiya": vardiya,
        "is_istasyon_adi": is_istasyon_adi,
    }


def test_business_key_returns_tuple_of_4():
    key = _business_key(_row())
    assert isinstance(key, tuple)
    assert len(key) == 4


def test_business_key_strips_whitespace():
    key = _business_key(_row(is_emri_no="  3025678325  "))
    assert key[1] == "3025678325"


def test_business_key_none_fields_become_empty():
    key = _business_key({"tarih": None, "is_emri_no": None, "vardiya": None, "is_istasyon_adi": None})
    assert key == ("", "", "", "")


def test_business_key_different_rows_differ():
    k1 = _business_key(_row(vardiya="1"))
    k2 = _business_key(_row(vardiya="2"))
    assert k1 != k2


# ---------------------------------------------------------------------------
# _find_infile_duplicates
# ---------------------------------------------------------------------------

def _make_rows(n: int, **override) -> list[dict]:
    """n identical rows with optional field overrides."""
    base = _row()
    base.update(override)
    return [dict(base) for _ in range(n)]


def test_no_duplicates_returns_empty_set():
    rows = [
        _row(vardiya="1"),
        _row(vardiya="2"),
        _row(vardiya="3"),
    ]
    assert _find_infile_duplicates(rows) == set()


def test_single_duplicate_returns_second_index():
    rows = _make_rows(2)       # both identical
    dupes = _find_infile_duplicates(rows)
    assert dupes == {1}        # first occurrence (0) kept, second (1) flagged


def test_three_duplicates_flags_second_and_third():
    rows = _make_rows(3)
    dupes = _find_infile_duplicates(rows)
    assert dupes == {1, 2}


def test_mixed_rows_flags_only_repeated():
    rows = [
        _row(vardiya="1"),
        _row(vardiya="2"),
        _row(vardiya="1"),   # duplicate of index 0
        _row(vardiya="3"),
    ]
    assert _find_infile_duplicates(rows) == {2}


def test_all_empty_key_rows_not_flagged():
    # Rows with all-empty business key are skipped (VG-01 handles them)
    rows = [
        {"tarih": None, "is_emri_no": None, "vardiya": None, "is_istasyon_adi": None},
        {"tarih": None, "is_emri_no": None, "vardiya": None, "is_istasyon_adi": None},
    ]
    assert _find_infile_duplicates(rows) == set()


def test_empty_rows_list():
    assert _find_infile_duplicates([]) == set()


def test_single_row_no_duplicate():
    assert _find_infile_duplicates([_row()]) == set()
