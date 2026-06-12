import re
from dataclasses import dataclass

from app.models.production_record import ProductionRecord

SHORT_DURATION_THRESHOLD = 5.0
SENTINEL_DURUS = 250.0
DURUS_TOLERANCE = 0.5
FORMULA_TOLERANCE = 1.0
IS_EMRI_PATTERN = re.compile(r"^302\d{7}$")
VALID_VARDIYAS = {1, 2, 3}

# VG-01
MANDATORY_FIELDS: list[tuple[str, str]] = [
    ("tarih",           "Tarih"),
    ("is_emri_no",      "İş Emri No"),
    ("is_istasyon_adi", "İş İstasyon Adı"),
    ("vardiya",         "Vardiya"),
]

# VG-02
OPTIONAL_FIELDS: list[tuple[str, str]] = [
    ("stok_adi",      "Stok Adı"),
    ("is_merkezi_no", "İş Merkezi No"),
]

_STATUS_PRIORITY = {"pending": -1, "clean": 0, "warning": 1, "rejected": 2}


@dataclass
class IssueData:
    rule_code: str
    severity: str        # 'error' | 'warning'
    field_name: str | None
    message: str
    suggested_action: str  # 'reject' | 'warn'


def validate_record(record: ProductionRecord) -> list[IssueData]:
    issues: list[IssueData] = []
    issues.extend(_check_vg01(record))
    issues.extend(_check_vg02(record))
    issues.extend(_check_vv01(record))
    issues.extend(_check_vf01(record))
    issues.extend(_check_vp01(record))
    issues.extend(_check_vq01(record))
    issues.extend(_check_vo01(record))
    issues.extend(_check_vc01(record))
    issues.extend(_check_vc02(record))
    issues.extend(_check_vc03(record))
    issues.extend(_check_vd01(record))
    issues.extend(_check_vd02(record))
    issues.extend(_check_vd03(record))
    issues.extend(_check_vl01(record))
    issues.extend(_check_vl02(record))
    issues.extend(_check_vl03(record))
    return issues


def determine_status(issues: list[IssueData]) -> str:
    if any(i.severity == "error" for i in issues):
        return "rejected"
    if any(i.severity == "warning" for i in issues):
        return "warning"
    return "clean"


def worst_status(*statuses: str) -> str:
    """En kötü validation durumunu döner: rejected > warning > clean/pending."""
    return max(statuses, key=lambda s: _STATUS_PRIORITY.get(s, 0))


# ---------------------------------------------------------------------------
# VG-01 · Zorunlu Alan Eksikliği — ERROR / REJECT
# ---------------------------------------------------------------------------
def _check_vg01(r: ProductionRecord) -> list[IssueData]:
    issues = []
    for field_attr, label in MANDATORY_FIELDS:
        if getattr(r, field_attr) is None:
            issues.append(IssueData(
                rule_code="VG-01",
                severity="error",
                field_name=field_attr,
                message=f"Zorunlu alan boş: {label}.",
                suggested_action="reject",
            ))
    return issues


# ---------------------------------------------------------------------------
# VG-02 · Opsiyonel Alan Eksikliği — WARNING / WARN
# ---------------------------------------------------------------------------
def _check_vg02(r: ProductionRecord) -> list[IssueData]:
    issues = []
    for field_attr, label in OPTIONAL_FIELDS:
        if getattr(r, field_attr) is None:
            issues.append(IssueData(
                rule_code="VG-02",
                severity="warning",
                field_name=field_attr,
                message=f"Opsiyonel alan boş: {label}. Raporlama etkilenebilir.",
                suggested_action="warn",
            ))
    return issues


# ---------------------------------------------------------------------------
# VV-01 · Vardiya Aralık Dışı — ERROR / REJECT
# ---------------------------------------------------------------------------
def _check_vv01(r: ProductionRecord) -> list[IssueData]:
    if r.vardiya is None:
        return []  # VG-01 zaten yakalar
    if r.vardiya not in VALID_VARDIYAS:
        return [IssueData(
            rule_code="VV-01",
            severity="error",
            field_name="vardiya",
            message=f"Vardiya değeri {r.vardiya} geçersiz. Geçerli değerler: 1, 2, 3.",
            suggested_action="reject",
        )]
    return []


# ---------------------------------------------------------------------------
# VF-01 · İş Emri No Format — WARNING / WARN
# ---------------------------------------------------------------------------
def _check_vf01(r: ProductionRecord) -> list[IssueData]:
    if r.is_emri_no is None:
        return []  # VG-01 yakalar
    if not IS_EMRI_PATTERN.match(str(r.is_emri_no)):
        return [IssueData(
            rule_code="VF-01",
            severity="warning",
            field_name="is_emri_no",
            message=f"İş emri no '{r.is_emri_no}' format dışı. Beklenen: 302XXXXXXX (10 hane).",
            suggested_action="warn",
        )]
    return []


# ---------------------------------------------------------------------------
# VP-01a · Performance > 100 + süre < 5 dk → Matematiksel artefakt — ERROR / REJECT
# VP-01b · Performance > 100 + süre ≥ 5 dk → Kalibrasyon şüphesi — WARNING / WARN
# ---------------------------------------------------------------------------
def _check_vp01(r: ProductionRecord) -> list[IssueData]:
    if r.performance is None:
        return []
    if r.performance <= 100:
        return []

    calisma = r.calisma_suresi if r.calisma_suresi is not None else 0.0

    if calisma < SHORT_DURATION_THRESHOLD:
        return [IssueData(
            rule_code="VP-01a",
            severity="error",
            field_name="performance",
            message=(
                f"Performance {r.performance:.2f} > 100 ve çalışma süresi {calisma:.2f} dk < 5 dk. "
                f"Kısa süre artefaktı — matematiksel olarak anlamsız değer."
            ),
            suggested_action="reject",
        )]
    else:
        return [IssueData(
            rule_code="VP-01b",
            severity="warning",
            field_name="performance",
            message=(
                f"Performance {r.performance:.2f} > 100 (çalışma süresi: {calisma:.2f} dk). "
                f"İdeal hız kalibrasyonu eski olabilir. Kullanıcı onayı gerekli."
            ),
            suggested_action="warn",
        )]


# ---------------------------------------------------------------------------
# VQ-01 · Quality Aralık Dışı — ERROR / REJECT
# ---------------------------------------------------------------------------
def _check_vq01(r: ProductionRecord) -> list[IssueData]:
    if r.quality is None:
        return []
    if not (0 <= r.quality <= 100):
        return [IssueData(
            rule_code="VQ-01",
            severity="error",
            field_name="quality",
            message=f"Kalite yüzdesi {r.quality:.2f} geçerli aralık dışı (0–100).",
            suggested_action="reject",
        )]
    return []


# ---------------------------------------------------------------------------
# VO-01 · OEE > 100 — WARNING / WARN
# ---------------------------------------------------------------------------
def _check_vo01(r: ProductionRecord) -> list[IssueData]:
    if r.oee is None:
        return []
    if r.oee > 100:
        return [IssueData(
            rule_code="VO-01",
            severity="warning",
            field_name="oee",
            message=f"OEE {r.oee:.2f} > 100. Genellikle VP-01a/VP-01b kaynaklı türetilmiş değer.",
            suggested_action="warn",
        )]
    return []


# ---------------------------------------------------------------------------
# VC-01 · Hatalı Miktar > Üretilen Miktar — ERROR / REJECT
# ---------------------------------------------------------------------------
def _check_vc01(r: ProductionRecord) -> list[IssueData]:
    if r.hatali_miktar is None or r.uretilen_miktar is None:
        return []
    if r.hatali_miktar > r.uretilen_miktar:
        return [IssueData(
            rule_code="VC-01",
            severity="error",
            field_name="hatali_miktar",
            message=(
                f"Fire {r.hatali_miktar} > Üretim {r.uretilen_miktar}. "
                f"Fiziksel olarak imkânsız."
            ),
            suggested_action="reject",
        )]
    return []


# ---------------------------------------------------------------------------
# VC-02 · Quality Formülü Tutarsızlığı — WARNING / WARN
# Q = (uretilen - hatali) / uretilen * 100
# ---------------------------------------------------------------------------
def _check_vc02(r: ProductionRecord) -> list[IssueData]:
    if r.quality is None or r.uretilen_miktar is None or r.hatali_miktar is None:
        return []
    if r.uretilen_miktar == 0:
        return []  # VL-02 veya VC-03 yakalar
    q_formula = (r.uretilen_miktar - r.hatali_miktar) / r.uretilen_miktar * 100
    if abs(r.quality - q_formula) > FORMULA_TOLERANCE:
        return [IssueData(
            rule_code="VC-02",
            severity="warning",
            field_name="quality",
            message=(
                f"Kalite formül uyumsuzluğu: bildirilen {r.quality:.2f}, "
                f"hesaplanan {q_formula:.2f} (fark: {abs(r.quality - q_formula):.2f})."
            ),
            suggested_action="warn",
        )]
    return []


# ---------------------------------------------------------------------------
# VC-03 · Negatif Miktar — ERROR / REJECT
# ---------------------------------------------------------------------------
def _check_vc03(r: ProductionRecord) -> list[IssueData]:
    issues = []
    if r.uretilen_miktar is not None and r.uretilen_miktar < 0:
        issues.append(IssueData(
            rule_code="VC-03",
            severity="error",
            field_name="uretilen_miktar",
            message=f"Üretilen miktar {r.uretilen_miktar} negatif olamaz.",
            suggested_action="reject",
        ))
    if r.hatali_miktar is not None and r.hatali_miktar < 0:
        issues.append(IssueData(
            rule_code="VC-03",
            severity="error",
            field_name="hatali_miktar",
            message=f"Hatalı miktar {r.hatali_miktar} negatif olamaz.",
            suggested_action="reject",
        ))
    return issues


# ---------------------------------------------------------------------------
# VD-01 · Negatif Çalışma Süresi — ERROR / REJECT
# ---------------------------------------------------------------------------
def _check_vd01(r: ProductionRecord) -> list[IssueData]:
    if r.calisma_suresi is not None and r.calisma_suresi < 0:
        return [IssueData(
            rule_code="VD-01",
            severity="error",
            field_name="calisma_suresi",
            message=f"Çalışma süresi {r.calisma_suresi:.2f} dk negatif olamaz.",
            suggested_action="reject",
        )]
    return []


# ---------------------------------------------------------------------------
# VD-02 · Duruş Toplamı Tutarsızlığı — WARNING / WARN
# planli_durus + plansiz_durus ≈ durus_suresi (±0.5 tolerans)
# ---------------------------------------------------------------------------
def _check_vd02(r: ProductionRecord) -> list[IssueData]:
    if r.planli_durus is None or r.plansiz_durus is None or r.durus_suresi is None:
        return []
    toplam = r.planli_durus + r.plansiz_durus
    if abs(toplam - r.durus_suresi) > DURUS_TOLERANCE:
        return [IssueData(
            rule_code="VD-02",
            severity="warning",
            field_name="durus_suresi",
            message=(
                f"Duruş toplamı tutarsız: planlı({r.planli_durus:.2f}) + "
                f"plansız({r.plansiz_durus:.2f}) = {toplam:.2f}, "
                f"toplam duruş = {r.durus_suresi:.2f} (fark: {abs(toplam - r.durus_suresi):.2f})."
            ),
            suggested_action="warn",
        )]
    return []


# ---------------------------------------------------------------------------
# VD-03 · Sentinel/Overflow Duruş (250 dakika) — WARNING / WARN
# ---------------------------------------------------------------------------
def _check_vd03(r: ProductionRecord) -> list[IssueData]:
    if r.durus_suresi is not None and r.durus_suresi == SENTINEL_DURUS:
        return [IssueData(
            rule_code="VD-03",
            severity="warning",
            field_name="durus_suresi",
            message=(
                f"Duruş süresi tam olarak {SENTINEL_DURUS} dk — "
                f"MES overflow/sentinel değeri şüphesi."
            ),
            suggested_action="warn",
        )]
    return []


# ---------------------------------------------------------------------------
# VL-01 · Availability=0 ama Üretim Var — ERROR / REJECT
# ---------------------------------------------------------------------------
def _check_vl01(r: ProductionRecord) -> list[IssueData]:
    if r.availability is None or r.uretilen_miktar is None:
        return []
    if r.availability == 0 and r.uretilen_miktar > 0:
        return [IssueData(
            rule_code="VL-01",
            severity="error",
            field_name="availability",
            message=(
                f"Availability 0 ama üretilen miktar {r.uretilen_miktar} > 0. "
                f"Fiziksel olarak tutarsız."
            ),
            suggested_action="reject",
        )]
    return []


# ---------------------------------------------------------------------------
# VL-02 · Çalışma Süresi=0 ama Üretim Var — ERROR / REJECT
# ---------------------------------------------------------------------------
def _check_vl02(r: ProductionRecord) -> list[IssueData]:
    if r.calisma_suresi is None or r.uretilen_miktar is None:
        return []
    if r.calisma_suresi == 0 and r.uretilen_miktar > 0:
        return [IssueData(
            rule_code="VL-02",
            severity="error",
            field_name="calisma_suresi",
            message=(
                f"Çalışma süresi 0 ama üretilen miktar {r.uretilen_miktar} > 0. "
                f"Fiziksel olarak tutarsız."
            ),
            suggested_action="reject",
        )]
    return []


# ---------------------------------------------------------------------------
# VL-03 · Availability Formülü Tutarsızlığı — WARNING / WARN
# A = calisma_suresi / (calisma_suresi + plansiz_durus) * 100
# ---------------------------------------------------------------------------
def _check_vl03(r: ProductionRecord) -> list[IssueData]:
    if r.availability is None or r.calisma_suresi is None or r.plansiz_durus is None:
        return []
    denominator = r.calisma_suresi + r.plansiz_durus
    if denominator == 0:
        return []
    a_formula = r.calisma_suresi / denominator * 100
    if abs(r.availability - a_formula) > FORMULA_TOLERANCE:
        return [IssueData(
            rule_code="VL-03",
            severity="warning",
            field_name="availability",
            message=(
                f"Availability formül sapması: bildirilen {r.availability:.2f}, "
                f"hesaplanan {a_formula:.2f} (fark: {abs(r.availability - a_formula):.2f}). "
                f"MES farklı availability tanımı kullanıyor olabilir."
            ),
            suggested_action="warn",
        )]
    return []
