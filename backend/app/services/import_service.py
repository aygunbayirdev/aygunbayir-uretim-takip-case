from sqlalchemy.orm import Session

from app.models.import_batch import ImportBatch
from app.models.production_record import ProductionRecord
from app.models.validation_issue import ValidationIssue
from app.services.csv_parser import parse_csv, get_temp_file, remove_temp_file
from app.services.validator import validate_record, determine_status, worst_status
from app.utils.date_utils import parse_date

BUSINESS_KEY_FIELDS = ("tarih", "is_emri_no", "vardiya", "is_istasyon_adi")
PROGRESS_COMMIT_EVERY = 100  # her N satırda bir progress commit


def _safe_int(val: str | None) -> int | None:
    try:
        return int(float(val)) if val and str(val).strip() else None
    except (ValueError, TypeError):
        return None


def _safe_float(val: str | None) -> float | None:
    try:
        return float(val) if val and str(val).strip() else None
    except (ValueError, TypeError):
        return None


def _row_to_record(row: dict, batch_id: int) -> ProductionRecord:
    return ProductionRecord(
        batch_id=batch_id,
        record_id=_safe_int(row.get("record_id")) or 0,
        csv_row_number=_safe_int(str(row.get("csv_row_number", ""))),
        tarih=parse_date(row.get("tarih")),
        is_emri_no=row.get("is_emri_no") or None,
        is_merkezi_no=row.get("is_merkezi_no") or None,
        ismerkezi_adi=row.get("ismerkezi_adi") or None,
        is_istasyon_adi=row.get("is_istasyon_adi") or None,
        stok_adi=row.get("stok_adi") or None,
        vardiya=_safe_int(row.get("vardiya")),
        availability=_safe_float(row.get("availability")),
        performance=_safe_float(row.get("performance")),
        quality=_safe_float(row.get("quality")),
        oee=_safe_float(row.get("oee")),
        calisma_suresi=_safe_float(row.get("calisma_suresi")),
        durus_suresi=_safe_float(row.get("durus_suresi")),
        planli_durus=_safe_float(row.get("planli_durus")),
        plansiz_durus=_safe_float(row.get("plansiz_durus")),
        uretilen_miktar=_safe_int(row.get("uretilen_miktar")),
        hatali_miktar=_safe_int(row.get("hatali_miktar")),
        validation_status="pending",
    )


def _business_key(row: dict) -> tuple[str, ...]:
    return tuple(str(row.get(f) or "").strip() for f in BUSINESS_KEY_FIELDS)


def _find_infile_duplicates(rows: list[dict]) -> set[int]:
    """
    İlk oluşum korunur, sonraki tekrarların index'leri döner.
    Business key alanlarının tümü boşsa VG-01'e bırakılır.
    """
    seen: dict[tuple, int] = {}
    duplicate_indices: set[int] = set()

    for idx, row in enumerate(rows):
        key = _business_key(row)
        if all(part == "" for part in key):
            continue
        if key in seen:
            duplicate_indices.add(idx)
        else:
            seen[key] = idx

    return duplicate_indices


def _check_cross_batch_duplicates(
    saved_records: list[tuple[ProductionRecord, dict]],
    batch_id: int,
    db: Session,
) -> int:
    """
    VD-05: Yeni kayıtları diğer batch'lerdeki kayıtlarla business key üzerinden karşılaştırır.
    Eşleşen kayıtlara WARNING ValidationIssue eklenir, validation_status 'warning' yapılır.
    Tek bulk query + in-memory lookup ile N sorgu yerine 1 sorgu kullanılır.
    """
    candidates = [
        record for record, _ in saved_records
        if record.validation_status != "rejected"
        and record.tarih and record.is_emri_no
        and record.vardiya and record.is_istasyon_adi
    ]

    if not candidates:
        return 0

    # Diğer batch'lerdeki tüm business key'leri tek sorguda çek
    existing_rows = db.query(
        ProductionRecord.id,
        ProductionRecord.batch_id,
        ProductionRecord.tarih,
        ProductionRecord.is_emri_no,
        ProductionRecord.vardiya,
        ProductionRecord.is_istasyon_adi,
    ).filter(ProductionRecord.batch_id != batch_id).all()

    # Python set ile O(1) lookup
    existing_key_map: dict[tuple, tuple[int, int]] = {
        (r.tarih, str(r.is_emri_no), str(r.vardiya), r.is_istasyon_adi): (r.id, r.batch_id)
        for r in existing_rows
    }

    flagged = 0
    for record in candidates:
        key = (
            record.tarih,
            str(record.is_emri_no or ""),
            str(record.vardiya or ""),
            record.is_istasyon_adi or "",
        )
        if key in existing_key_map:
            existing_id, existing_batch_id = existing_key_map[key]
            db.add(ValidationIssue(
                record_id=record.id,
                rule_code="VD-05",
                severity="warning",
                field_name=",".join(BUSINESS_KEY_FIELDS),
                message=(
                    f"Çapraz-batch duplicate: Bu kayıt daha önce "
                    f"Batch #{existing_batch_id}'de import edildi "
                    f"(Kayıt ID: {existing_id})."
                ),
                suggested_action="warn",
            ))
            if record.validation_status == "pending":
                record.validation_status = "warning"
            flagged += 1

    return flagged


def import_csv(token: str, mapping: dict[str, str], db: Session, batch: ImportBatch | None = None) -> ImportBatch:
    temp = get_temp_file(token)
    if not temp:
        raise ValueError("Geçersiz token veya oturum süresi dolmuş.")

    file_bytes, filename, file_hash = temp

    if batch is None:
        # Synchronous path — batch oluştur
        existing = db.query(ImportBatch).filter(ImportBatch.file_hash == file_hash).first()
        if existing:
            raise ValueError(f"Bu dosya daha önce yüklendi (Batch ID: {existing.id}).")
        batch = ImportBatch(
            filename=filename,
            total_rows=0,
            accepted_rows=0,
            rejected_rows=0,
            status="processing",
            file_hash=file_hash,
        )
        db.add(batch)
        db.flush()

    _process_import(batch, file_bytes, mapping, file_hash, db)
    remove_temp_file(token)
    return batch


def _process_import(
    batch: ImportBatch,
    file_bytes: bytes,
    mapping: dict[str, str],
    file_hash: str,
    db: Session,
) -> None:
    """Asıl CSV işleme mantığı — batch üzerinde in-place çalışır."""
    parse_result = parse_csv(file_bytes, mapping, file_hash=file_hash)
    duplicate_indices = _find_infile_duplicates(parse_result.rows)

    batch.total_rows = parse_result.total_rows
    saved_records: list[tuple[ProductionRecord, dict]] = []

    for idx, row in enumerate(parse_result.rows):
        record = _row_to_record(row, batch.id)
        if idx in duplicate_indices:
            record.validation_status = "rejected"
        db.add(record)
        saved_records.append((record, row))

    db.flush()

    _check_cross_batch_duplicates(saved_records, batch.id, db)

    # VD-04 + validation tek döngüde; her PROGRESS_COMMIT_EVERY satırda progress commit
    total = len(saved_records)
    for idx, (record, row) in enumerate(saved_records):
        if idx in duplicate_indices:
            key = _business_key(row)
            db.add(ValidationIssue(
                record_id=record.id,
                rule_code="VD-04",
                severity="error",
                field_name=",".join(BUSINESS_KEY_FIELDS),
                message=(
                    f"Dosya içi duplicate: tarih={key[0]}, "
                    f"is_emri_no={key[1]}, vardiya={key[2]}, istasyon={key[3]}"
                ),
                suggested_action="reject",
            ))

        if record.validation_status != "rejected":
            issues = validate_record(record)
            validator_status = determine_status(issues)
            record.validation_status = worst_status(record.validation_status, validator_status)
            for issue in issues:
                db.add(ValidationIssue(
                    record_id=record.id,
                    rule_code=issue.rule_code,
                    severity=issue.severity,
                    field_name=issue.field_name,
                    message=issue.message,
                    suggested_action=issue.suggested_action,
                ))

        processed = idx + 1
        if processed % PROGRESS_COMMIT_EVERY == 0 or processed == total:
            batch.processed_rows = processed
            db.commit()

    batch.accepted_rows = sum(1 for r, _ in saved_records if r.validation_status != "rejected")
    batch.rejected_rows = sum(1 for r, _ in saved_records if r.validation_status == "rejected")
    batch.status = "completed"
    batch.processed_rows = total
    db.commit()
    db.refresh(batch)


def run_import_background(batch_id: int, token: str, mapping: dict[str, str]) -> None:
    """FastAPI BackgroundTasks ile çağrılır — kendi DB oturumunu açar."""
    from app.database import SessionLocal

    db = SessionLocal()
    db.expire_on_commit = False  # intermediate progress commit'leri sonrası nesneler expire olmaz
    try:
        batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
        if not batch:
            return
        temp = get_temp_file(token)
        if not temp:
            batch.status = "failed"
            db.commit()
            return
        file_bytes, _, file_hash = temp
        try:
            _process_import(batch, file_bytes, mapping, file_hash, db)
        except Exception:
            batch.status = "failed"
            db.commit()
        finally:
            remove_temp_file(token)
    finally:
        db.close()
