import hashlib
import io
import time
import uuid
from dataclasses import dataclass, field

import chardet
import pandas as pd

CHUNK_SIZE = 5000
ENCODING_CONFIDENCE_THRESHOLD = 0.7
FALLBACK_ENCODING = "latin-1"
IGNORE_FIELD = "ignore"
SAMPLE_ROWS = 5
TEMP_TTL_SECONDS = 600  # 10 dakika — confirm edilmeyen preview dosyaları temizlenir

TARGET_FIELDS = [
    "record_id", "tarih", "is_emri_no", "is_merkezi_no", "ismerkezi_adi",
    "is_istasyon_adi", "stok_adi", "vardiya", "availability", "performance",
    "quality", "oee", "calisma_suresi", "durus_suresi", "planli_durus",
    "plansiz_durus", "uretilen_miktar", "hatali_miktar",
]

# Priority-ordered: daha spesifik pattern'lar önce gelmeli
FIELD_HINTS: list[tuple[str, list[str]]] = [
    ("record_id",       ["record_id"]),
    ("tarih",           ["tarih"]),
    ("is_emri_no",      ["emri no"]),
    ("is_merkezi_no",   ["merkezi no"]),
    ("ismerkezi_adi",   ["merkezi ad"]),
    ("is_istasyon_adi", ["stasyon ad"]),
    ("stok_adi",        ["stok ad"]),
    ("vardiya",         ["vardiya"]),
    ("availability",    ["kullan"]),
    ("performance",     ["performans"]),
    ("quality",         ["kalite"]),
    ("oee",             ["oee"]),
    ("planli_durus",    ["planl"]),       # durus_suresi'nden önce gelecek
    ("plansiz_durus",   ["plans"]),       # durus_suresi'nden önce gelecek
    ("durus_suresi",    ["duru"]),
    ("calisma_suresi",  ["al??ma"]),      # "?al??ma" içindeki bozulmamış kısım
    ("hatali_miktar",   ["hatal"]),       # uretilen_miktar'dan önce: "Hatal? ?retilen Miktar" da "retilen miktar" geçiyor
    ("uretilen_miktar", ["retilen miktar"]),
]

# token → (file_bytes, filename, file_hash, created_at)  — hash bir kez hesaplanır, tekrar kullanılır
_temp_store: dict[str, tuple[bytes, str, str, float]] = {}


@dataclass
class ColumnInfo:
    csv_name: str
    suggested_field: str | None
    sample_values: list[str]


@dataclass
class PreviewResult:
    token: str
    encoding: str
    file_hash: str
    columns: list[ColumnInfo]


@dataclass
class ParseResult:
    file_hash: str
    total_rows: int
    encoding: str
    rows: list[dict] = field(default_factory=list)


def _detect_encoding(raw_bytes: bytes) -> str:
    result = chardet.detect(raw_bytes)
    if result["confidence"] and result["confidence"] >= ENCODING_CONFIDENCE_THRESHOLD:
        return result["encoding"]
    return FALLBACK_ENCODING


def _compute_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def _auto_detect_field(csv_col: str) -> str | None:
    lower = csv_col.lower()
    for field_name, hints in FIELD_HINTS:
        for hint in hints:
            if hint in lower:
                return field_name
    return None


def _cleanup_expired() -> None:
    now = time.time()
    expired = [t for t, (_, _, _, ts) in _temp_store.items() if now - ts > TEMP_TTL_SECONDS]
    for t in expired:
        del _temp_store[t]


def parse_preview(file_bytes: bytes, filename: str) -> PreviewResult:
    _cleanup_expired()  # her yüklemede süresi dolmuş dosyaları temizle

    encoding = _detect_encoding(file_bytes[:10_000])
    file_hash = _compute_hash(file_bytes)  # tek hesaplama noktası
    token = str(uuid.uuid4())
    _temp_store[token] = (file_bytes, filename, file_hash, time.time())

    df = pd.read_csv(
        io.BytesIO(file_bytes),
        encoding=encoding,
        nrows=SAMPLE_ROWS,
        dtype=str,
        keep_default_na=False,
    )

    columns: list[ColumnInfo] = []
    for col in df.columns:
        columns.append(ColumnInfo(
            csv_name=col,
            suggested_field=_auto_detect_field(col),
            sample_values=[str(v) for v in df[col].tolist()],
        ))

    return PreviewResult(token=token, encoding=encoding, file_hash=file_hash, columns=columns)


def get_temp_file(token: str) -> tuple[bytes, str, str] | None:
    """Returns (file_bytes, filename, file_hash) or None if missing/expired."""
    entry = _temp_store.get(token)
    if entry is None:
        return None
    file_bytes, filename, file_hash, created_at = entry
    if time.time() - created_at > TEMP_TTL_SECONDS:
        del _temp_store[token]
        return None
    return file_bytes, filename, file_hash


def remove_temp_file(token: str) -> None:
    _temp_store.pop(token, None)


def parse_csv(
    file_bytes: bytes,
    mapping: dict[str, str],
    file_hash: str | None = None,
) -> ParseResult:
    """
    mapping: { csv_sütun_adı → orm_field_adı | IGNORE_FIELD }
    file_hash: önceden hesaplanmışsa tekrar hesaplanmaz.
    """
    invalid = [v for v in mapping.values() if v not in TARGET_FIELDS and v != IGNORE_FIELD]
    if invalid:
        raise ValueError(f"Geçersiz hedef alan(lar): {invalid}")

    encoding = _detect_encoding(file_bytes[:10_000])
    file_hash = file_hash or _compute_hash(file_bytes)

    try:
        reader = pd.read_csv(
            io.BytesIO(file_bytes),
            encoding=encoding,
            chunksize=CHUNK_SIZE,
            header=0,
            dtype=str,
            keep_default_na=False,
        )
    except Exception as exc:
        raise ValueError(f"CSV okunamadı (encoding={encoding}): {exc}") from exc

    rows: list[dict] = []
    row_offset = 0

    for chunk in reader:
        rename_map = {
            col: mapping[col]
            for col in chunk.columns
            if col in mapping and mapping[col] != IGNORE_FIELD
        }
        chunk = chunk.rename(columns=rename_map)
        cols_to_keep = [c for c in chunk.columns if c in TARGET_FIELDS]
        chunk = chunk[cols_to_keep]

        for local_idx, (_, series) in enumerate(chunk.iterrows()):
            row = series.to_dict()
            row["csv_row_number"] = row_offset + local_idx + 2  # +1 header, +1 1-based
            rows.append(row)

        row_offset += len(chunk)

    return ParseResult(file_hash=file_hash, total_rows=len(rows), encoding=encoding, rows=rows)
