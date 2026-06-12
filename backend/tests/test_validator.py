"""
Unit tests for services/validator.py
Each validation rule is tested with: a triggering case, a boundary case,
and a passing case (where applicable).
"""
import datetime
import pytest

from app.models.production_record import ProductionRecord
from app.services.validator import (
    IssueData,
    determine_status,
    validate_record,
    worst_status,
)


def make_record(**kwargs) -> ProductionRecord:
    """
    Returns a clean ProductionRecord with all formula values consistent.
    calisma=420, plansiz=80  → A = 420/(420+80)*100 = 84.0
    planli=20, plansiz=80   → durus = 100 (within ±0.5 of 100)
    uretilen=500, hatali=25 → Q = (500-25)/500*100 = 95.0
    """
    defaults = dict(
        tarih=datetime.date(2024, 1, 15),
        is_emri_no="3025678325",
        is_merkezi_no="MC-01",
        ismerkezi_adi="Merkez 1",
        is_istasyon_adi="ST-01",
        stok_adi="Part-A",
        vardiya=1,
        availability=84.0,
        performance=90.0,
        quality=95.0,
        oee=71.82,
        calisma_suresi=420.0,
        durus_suresi=100.0,
        planli_durus=20.0,
        plansiz_durus=80.0,
        uretilen_miktar=500,
        hatali_miktar=25,
    )
    defaults.update(kwargs)
    return ProductionRecord(**defaults)


# ---------------------------------------------------------------------------
# determine_status
# ---------------------------------------------------------------------------

def test_determine_status_no_issues_is_clean():
    assert determine_status([]) == "clean"


def test_determine_status_warning_only():
    issues = [IssueData("VO-01", "warning", "oee", "msg", "warn")]
    assert determine_status(issues) == "warning"


def test_determine_status_error_overrides_warning():
    issues = [
        IssueData("VO-01", "warning", "oee", "msg", "warn"),
        IssueData("VG-01", "error", "tarih", "msg", "reject"),
    ]
    assert determine_status(issues) == "rejected"


# ---------------------------------------------------------------------------
# worst_status
# ---------------------------------------------------------------------------

def test_worst_status_rejected_wins():
    assert worst_status("clean", "warning", "rejected") == "rejected"


def test_worst_status_warning_over_clean():
    assert worst_status("clean", "warning") == "warning"


def test_worst_status_pending_yields_to_clean():
    # pending has lower priority than clean — validated record should become clean
    assert worst_status("pending", "clean") == "clean"


# ---------------------------------------------------------------------------
# VG-01 — Mandatory field missing → ERROR / REJECT
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("field", ["tarih", "is_emri_no", "is_istasyon_adi", "vardiya"])
def test_vg01_missing_field_raises_error(field):
    record = make_record(**{field: None})
    issues = validate_record(record)
    vg01 = [i for i in issues if i.rule_code == "VG-01"]
    assert vg01, f"VG-01 expected for missing '{field}'"
    assert all(i.severity == "error" for i in vg01)
    assert all(i.suggested_action == "reject" for i in vg01)


def test_vg01_all_mandatory_present_no_issue():
    record = make_record()
    issues = validate_record(record)
    assert not any(i.rule_code == "VG-01" for i in issues)


# ---------------------------------------------------------------------------
# VG-02 — Optional field missing → WARNING / WARN
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("field", ["stok_adi", "is_merkezi_no"])
def test_vg02_missing_optional_is_warning(field):
    record = make_record(**{field: None})
    issues = validate_record(record)
    vg02 = [i for i in issues if i.rule_code == "VG-02"]
    assert vg02
    assert all(i.severity == "warning" for i in vg02)


# ---------------------------------------------------------------------------
# VP-01a — Performance > 100 AND calisma_suresi < 5 dk → ERROR (artefact)
# ---------------------------------------------------------------------------

def test_vp01a_short_duration_artefact():
    record = make_record(performance=348.5, calisma_suresi=2.0)
    issues = validate_record(record)
    assert any(i.rule_code == "VP-01a" and i.severity == "error" for i in issues)
    assert not any(i.rule_code == "VP-01b" for i in issues)


def test_vp01a_not_triggered_at_boundary_5_min():
    # calisma_suresi == 5.0 → must trigger VP-01b, not VP-01a
    record = make_record(performance=110.0, calisma_suresi=5.0)
    codes = [i.rule_code for i in validate_record(record)]
    assert "VP-01a" not in codes
    assert "VP-01b" in codes


def test_vp01_no_issue_within_100():
    record = make_record(performance=99.9)
    assert not any(i.rule_code.startswith("VP-01") for i in validate_record(record))


# ---------------------------------------------------------------------------
# VP-01b — Performance > 100 AND calisma_suresi >= 5 dk → WARNING (calibration)
# ---------------------------------------------------------------------------

def test_vp01b_calibration_suspect_is_warning():
    record = make_record(performance=115.0, calisma_suresi=60.0)
    issues = validate_record(record)
    assert any(i.rule_code == "VP-01b" and i.severity == "warning" for i in issues)
    assert not any(i.rule_code == "VP-01a" for i in issues)


def test_vp01b_exactly_100_is_ok():
    record = make_record(performance=100.0)
    assert not any(i.rule_code.startswith("VP-01") for i in validate_record(record))


# ---------------------------------------------------------------------------
# VQ-01 — Quality out of [0, 100] → ERROR
# ---------------------------------------------------------------------------

def test_vq01_negative_quality():
    record = make_record(quality=-0.1, hatali_miktar=0)
    assert any(i.rule_code == "VQ-01" and i.severity == "error" for i in validate_record(record))


def test_vq01_above_100():
    record = make_record(quality=100.1)
    assert any(i.rule_code == "VQ-01" and i.severity == "error" for i in validate_record(record))


def test_vq01_boundary_zero_ok():
    record = make_record(quality=0.0, hatali_miktar=500)
    assert not any(i.rule_code == "VQ-01" for i in validate_record(record))


def test_vq01_boundary_100_ok():
    record = make_record(quality=100.0, hatali_miktar=0)
    assert not any(i.rule_code == "VQ-01" for i in validate_record(record))


# ---------------------------------------------------------------------------
# VO-01 — OEE > 100 → WARNING
# ---------------------------------------------------------------------------

def test_vo01_oee_over_100():
    record = make_record(oee=110.0)
    assert any(i.rule_code == "VO-01" and i.severity == "warning" for i in validate_record(record))


def test_vo01_exactly_100_ok():
    record = make_record(oee=100.0)
    assert not any(i.rule_code == "VO-01" for i in validate_record(record))


def test_vo01_none_skipped():
    record = make_record(oee=None)
    assert not any(i.rule_code == "VO-01" for i in validate_record(record))


# ---------------------------------------------------------------------------
# VC-01 — Defective > Produced → ERROR
# ---------------------------------------------------------------------------

def test_vc01_defective_exceeds_produced():
    record = make_record(uretilen_miktar=100, hatali_miktar=101)
    assert any(i.rule_code == "VC-01" and i.severity == "error" for i in validate_record(record))


def test_vc01_defective_equals_produced_ok():
    record = make_record(uretilen_miktar=100, hatali_miktar=100, quality=0.0)
    assert not any(i.rule_code == "VC-01" for i in validate_record(record))


def test_vc01_zero_defective_ok():
    record = make_record(uretilen_miktar=500, hatali_miktar=0, quality=100.0)
    assert not any(i.rule_code == "VC-01" for i in validate_record(record))


# ---------------------------------------------------------------------------
# VC-02 — Quality formula mismatch (>1%) → WARNING
# ---------------------------------------------------------------------------

def test_vc02_formula_mismatch():
    # formula = (100-10)/100*100 = 90.0, reported = 95.0 → diff = 5 > 1
    record = make_record(uretilen_miktar=100, hatali_miktar=10, quality=95.0)
    assert any(i.rule_code == "VC-02" and i.severity == "warning" for i in validate_record(record))


def test_vc02_formula_match():
    # formula = (500-25)/500*100 = 95.0, reported = 95.0 → diff = 0
    record = make_record(uretilen_miktar=500, hatali_miktar=25, quality=95.0)
    assert not any(i.rule_code == "VC-02" for i in validate_record(record))


def test_vc02_within_tolerance():
    # formula = (1000-100)/1000*100 = 90.0, reported = 90.5 → diff = 0.5 ≤ 1.0
    record = make_record(uretilen_miktar=1000, hatali_miktar=100, quality=90.5)
    assert not any(i.rule_code == "VC-02" for i in validate_record(record))


# ---------------------------------------------------------------------------
# VC-03 — Negative quantities → ERROR
# ---------------------------------------------------------------------------

def test_vc03_negative_produced():
    record = make_record(uretilen_miktar=-1)
    issues = validate_record(record)
    assert any(i.rule_code == "VC-03" and i.field_name == "uretilen_miktar" for i in issues)


def test_vc03_negative_defective():
    record = make_record(hatali_miktar=-3)
    issues = validate_record(record)
    assert any(i.rule_code == "VC-03" and i.field_name == "hatali_miktar" for i in issues)


def test_vc03_both_zero_ok():
    record = make_record(uretilen_miktar=0, hatali_miktar=0, quality=100.0, calisma_suresi=0.0)
    issues = validate_record(record)
    assert not any(i.rule_code == "VC-03" for i in issues)


# ---------------------------------------------------------------------------
# VD-01 — Negative working time → ERROR
# ---------------------------------------------------------------------------

def test_vd01_negative():
    record = make_record(calisma_suresi=-1.0)
    assert any(i.rule_code == "VD-01" and i.severity == "error" for i in validate_record(record))


def test_vd01_zero_ok():
    record = make_record(calisma_suresi=0.0, uretilen_miktar=0)
    assert not any(i.rule_code == "VD-01" for i in validate_record(record))


# ---------------------------------------------------------------------------
# VD-02 — Downtime sum mismatch (±0.5 tolerance) → WARNING
# ---------------------------------------------------------------------------

def test_vd02_mismatch():
    # planli=20 + plansiz=10 = 30, durus_suresi=40 → diff=10 > 0.5
    record = make_record(planli_durus=20.0, plansiz_durus=10.0, durus_suresi=40.0)
    assert any(i.rule_code == "VD-02" and i.severity == "warning" for i in validate_record(record))


def test_vd02_within_tolerance():
    # diff = 0.3 ≤ 0.5 → ok
    record = make_record(planli_durus=20.0, plansiz_durus=10.0, durus_suresi=30.3)
    assert not any(i.rule_code == "VD-02" for i in validate_record(record))


def test_vd02_exact_match():
    record = make_record(planli_durus=20.0, plansiz_durus=80.0, durus_suresi=100.0)
    assert not any(i.rule_code == "VD-02" for i in validate_record(record))


# ---------------------------------------------------------------------------
# VD-03 — Sentinel downtime value (250.0) → WARNING
# ---------------------------------------------------------------------------

def test_vd03_sentinel_250():
    record = make_record(durus_suresi=250.0)
    assert any(i.rule_code == "VD-03" and i.severity == "warning" for i in validate_record(record))


def test_vd03_249_is_ok():
    record = make_record(durus_suresi=249.0)
    assert not any(i.rule_code == "VD-03" for i in validate_record(record))


def test_vd03_none_skipped():
    record = make_record(durus_suresi=None)
    assert not any(i.rule_code == "VD-03" for i in validate_record(record))


# ---------------------------------------------------------------------------
# VL-01 — Availability=0 but production > 0 → ERROR
# ---------------------------------------------------------------------------

def test_vl01_zero_availability_with_production():
    record = make_record(availability=0.0, uretilen_miktar=100)
    assert any(i.rule_code == "VL-01" and i.severity == "error" for i in validate_record(record))


def test_vl01_zero_availability_zero_production_ok():
    record = make_record(availability=0.0, uretilen_miktar=0, calisma_suresi=0.0)
    assert not any(i.rule_code == "VL-01" for i in validate_record(record))


# ---------------------------------------------------------------------------
# VL-02 — Working time=0 but production > 0 → ERROR
# ---------------------------------------------------------------------------

def test_vl02_zero_time_with_production():
    record = make_record(calisma_suresi=0.0, uretilen_miktar=50)
    assert any(i.rule_code == "VL-02" and i.severity == "error" for i in validate_record(record))


def test_vl02_zero_time_zero_production_ok():
    record = make_record(calisma_suresi=0.0, uretilen_miktar=0, availability=0.0)
    assert not any(i.rule_code == "VL-02" for i in validate_record(record))


# ---------------------------------------------------------------------------
# VL-03 — Availability formula mismatch (>1%) → WARNING
# A = calisma / (calisma + plansiz) * 100
# ---------------------------------------------------------------------------

def test_vl03_formula_mismatch():
    # formula = 300/(300+100)*100 = 75.0, reported = 85.0 → diff = 10 > 1
    record = make_record(calisma_suresi=300.0, plansiz_durus=100.0, availability=85.0)
    assert any(i.rule_code == "VL-03" and i.severity == "warning" for i in validate_record(record))


def test_vl03_formula_match():
    # formula = 300/(300+100)*100 = 75.0
    record = make_record(calisma_suresi=300.0, plansiz_durus=100.0, availability=75.0)
    assert not any(i.rule_code == "VL-03" for i in validate_record(record))


def test_vl03_zero_denominator_skipped():
    # calisma=0, plansiz=0 → denominator=0, skip check
    record = make_record(calisma_suresi=0.0, plansiz_durus=0.0, availability=0.0, uretilen_miktar=0)
    assert not any(i.rule_code == "VL-03" for i in validate_record(record))


# ---------------------------------------------------------------------------
# VV-01 — Shift out of {1, 2, 3} → ERROR
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("shift", [1, 2, 3])
def test_vv01_valid_shifts(shift):
    record = make_record(vardiya=shift)
    assert not any(i.rule_code == "VV-01" for i in validate_record(record))


@pytest.mark.parametrize("shift", [0, 4, 99, -1])
def test_vv01_invalid_shift(shift):
    record = make_record(vardiya=shift)
    assert any(i.rule_code == "VV-01" and i.severity == "error" for i in validate_record(record))


# ---------------------------------------------------------------------------
# VF-01 — Work order number format (^302\d{7}$) → WARNING
# ---------------------------------------------------------------------------

def test_vf01_valid_format():
    record = make_record(is_emri_no="3025678325")
    assert not any(i.rule_code == "VF-01" for i in validate_record(record))


def test_vf01_wrong_prefix():
    record = make_record(is_emri_no="4025678325")
    assert any(i.rule_code == "VF-01" and i.severity == "warning" for i in validate_record(record))


def test_vf01_too_short():
    record = make_record(is_emri_no="302567")
    assert any(i.rule_code == "VF-01" for i in validate_record(record))


def test_vf01_none_skipped():
    # VG-01 handles None; VF-01 should not double-fire
    record = make_record(is_emri_no=None)
    assert not any(i.rule_code == "VF-01" for i in validate_record(record))


# ---------------------------------------------------------------------------
# Integration — fully clean record
# ---------------------------------------------------------------------------

def test_clean_record_has_no_errors():
    record = make_record()
    issues = validate_record(record)
    error_issues = [i for i in issues if i.severity == "error"]
    assert error_issues == [], f"Unexpected errors: {error_issues}"


def test_clean_record_status_is_clean():
    # All formula fields consistent → no warnings either
    record = make_record(
        calisma_suresi=420.0,
        plansiz_durus=80.0,
        planli_durus=20.0,
        durus_suresi=100.0,      # 20+80 = 100 ✓
        availability=84.0,       # 420/(420+80)*100 = 84.0 ✓
        uretilen_miktar=500,
        hatali_miktar=25,
        quality=95.0,            # (500-25)/500*100 = 95.0 ✓
        performance=90.0,
        oee=71.82,
    )
    issues = validate_record(record)
    assert determine_status(issues) == "clean"
