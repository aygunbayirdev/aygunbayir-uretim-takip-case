# CLAUDE.md — Üretim Performans Takip Uygulaması

> Bu dosya Claude Code için proje rehberidir. Kod üretmeden önce baştan sona oku.

---

## 1. Proje Özeti

Magna otomotiv yan sanayi için injection molding hattı OEE takip uygulaması.
MES sisteminden gelen CSV verisi import edilir, validate edilir, dashboard'da görselleştirilir,
temiz kayıtlar REST API ile hedef sisteme gönderilir.

**Stack:** FastAPI (Python) + React (TypeScript) + SQLite

---

## 2. Dizin Yapısı

```
aygun-uretim-takip-case/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app factory, CORS, router mount
│   │   ├── config.py                 # Settings (pydantic-settings, .env okur)
│   │   ├── database.py               # SQLAlchemy engine, SessionLocal, Base
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── production_record.py  # ProductionRecord ORM modeli
│   │   │   ├── validation_issue.py   # ValidationIssue ORM modeli
│   │   │   ├── import_batch.py       # ImportBatch ORM modeli
│   │   │   └── api_submission.py     # ApiSubmission ORM modeli
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── production.py         # Pydantic request/response şemaları
│   │   │   ├── validation.py         # ValidationReport, ValidationIssue şemaları
│   │   │   └── submission.py         # ApiSubmission şemaları
│   │   ├── repositories/
│   │   │   ├── __init__.py
│   │   │   ├── production_repo.py    # CRUD — ProductionRecord
│   │   │   ├── validation_repo.py    # CRUD — ValidationIssue
│   │   │   └── submission_repo.py    # CRUD — ApiSubmission
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── csv_parser.py         # CSV okuma, encoding detection, ham parse
│   │   │   ├── validator.py          # Tüm validation kuralları (bkz. Bölüm 6)
│   │   │   ├── import_service.py     # Import orchestration, duplicate check
│   │   │   ├── dashboard_service.py  # OEE aggregation, KPI hesaplama
│   │   │   └── api_client.py         # Hedef REST API entegrasyonu, retry, idempotency
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── import_router.py      # POST /api/import/upload
│   │   │   ├── records_router.py     # GET /api/records (filtreli)
│   │   │   ├── dashboard_router.py   # GET /api/dashboard/*
│   │   │   ├── validation_router.py  # GET/PATCH /api/validation/*
│   │   │   └── submission_router.py  # POST /api/submissions/send
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── date_utils.py         # Tarih parse yardımcıları
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_validator.py         # Validator unit testleri (pytest)
│   │   ├── test_import_service.py
│   │   └── test_api_client.py
│   ├── data/
│   │   └── production_data.csv       # Test verisi (repoda bulunacak)
│   ├── requirements.txt
│   ├── .env.example
│   └── alembic/                      # DB migration (opsiyonel bonus)
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ImportPage.tsx
│   │   │   ├── RecordsPage.tsx
│   │   │   ├── ValidationPage.tsx
│   │   │   └── SubmissionsPage.tsx   # API gönderim geçmişi
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── TopBar.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── KpiCards.tsx
│   │   │   │   ├── OeeTrendChart.tsx
│   │   │   │   ├── ShiftComparisonChart.tsx
│   │   │   │   ├── StationRankingChart.tsx
│   │   │   │   └── QualityDistributionChart.tsx
│   │   │   ├── import/
│   │   │   │   ├── CsvDropzone.tsx
│   │   │   │   ├── PreviewTable.tsx
│   │   │   │   ├── ImportProgress.tsx    # Yükleme ilerleme çubuğu (polling)
│   │   │   │   └── ImportSummary.tsx
│   │   │   ├── validation/
│   │   │   │   ├── ValidationReportTable.tsx
│   │   │   │   ├── EditRecordModal.tsx
│   │   │   │   └── AuditTrailDrawer.tsx
│   │   │   └── shared/
│   │   │       ├── FilterBar.tsx
│   │   │       ├── DataTable.tsx
│   │   │       └── StatusBadge.tsx
│   │   ├── hooks/
│   │   │   ├── useImport.ts
│   │   │   ├── useDashboard.ts
│   │   │   ├── useRecords.ts
│   │   │   ├── useValidation.ts
│   │   │   └── useSubmissions.ts
│   │   ├── services/
│   │   │   └── api.ts                # Axios instance + tüm API çağrıları
│   │   ├── store/
│   │   │   └── filterStore.ts        # Zustand — global filtre state
│   │   └── types/
│   │       └── index.ts              # Shared TypeScript tipleri
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── ai_usage/                         # AI kullanım şeffaflığı (case study zorunluluğu)
│   └── 01_project_planning.md
├── .gitignore
└── README.md
```

---

## 3. Mimari Prensipler

### Backend (FastAPI — Layered Architecture)

.NET Onion/Clean Architecture'dan ilham alan katmanlı yapı:

```
Router (HTTP) → Service (Business Logic) → Repository (Data Access) → SQLAlchemy Model
```

- **Routers:** Sadece HTTP parse + response serialize. İş mantığı yok.
- **Services:** Tüm domain logic burada. Repository'e bağımlı, dışarıya bağımlı değil.
- **Repositories:** SQLAlchemy session yönetimi. Raw SQL yok; ORM first.
- **Schemas (Pydantic):** Request/response DTO'ları. ORM modellerinden ayrı tutulur.
- **Dependency Injection:** FastAPI `Depends()` ile DB session ve service enjeksiyonu.

### Frontend (React — Feature-Based)

```
Pages (route level) → Components (UI) → Hooks (state + API) → Services (HTTP)
```

- **State:** Zustand (filtreler global), React Query (server state / cache).
- **Tip güvenliği:** Strict TypeScript. `any` yasak.
- **UI:** shadcn/ui + Tailwind. Chart'lar için Recharts.

---

## 4. Veritabanı Şeması (SQLite)

### `import_batches`
```sql
id            INTEGER PK
filename      TEXT NOT NULL
imported_at   TIMESTAMP DEFAULT NOW
total_rows    INTEGER
accepted_rows INTEGER
rejected_rows INTEGER
status        TEXT  -- 'completed' | 'processing' | 'failed'
file_hash     TEXT UNIQUE  -- SHA-256, duplicate import koruması
```

### `production_records`
```sql
id                  INTEGER PK
batch_id            INTEGER FK → import_batches
record_id           INTEGER NOT NULL        -- CSV'den gelen record_id
csv_row_number      INTEGER                 -- Data lineage: CSV'deki orijinal satır no (bonus)
tarih               DATE NOT NULL
is_emri_no          TEXT
is_merkezi_no       TEXT
ismerkezi_adi       TEXT
is_istasyon_adi     TEXT
stok_adi            TEXT
vardiya             INTEGER                 -- 1, 2, 3
availability        REAL                    -- A (%)
performance         REAL                    -- P (%)
quality             REAL                    -- Q (%)
oee                 REAL
calisma_suresi      REAL                    -- dakika
durus_suresi        REAL
planli_durus        REAL
plansiz_durus       REAL
uretilen_miktar     INTEGER
hatali_miktar       INTEGER
validation_status   TEXT DEFAULT 'pending'  -- 'clean' | 'warning' | 'rejected'
is_sent             INTEGER DEFAULT 0       -- API'ye gönderildi mi (bool)
created_at          TIMESTAMP DEFAULT NOW
updated_at          TIMESTAMP DEFAULT NOW
```

### `validation_issues`
```sql
id              INTEGER PK
record_id       INTEGER FK → production_records
rule_code       TEXT NOT NULL   -- V01, V02, ... (bkz. Bölüm 6)
severity        TEXT NOT NULL   -- 'error' | 'warning'
field_name      TEXT            -- Hangi alan
message         TEXT            -- İnsan okunabilir mesaj
suggested_action TEXT           -- 'reject' | 'warn' | 'autocorrect'
resolved        INTEGER DEFAULT 0
resolved_at     TIMESTAMP
resolved_by     TEXT
correction_note TEXT            -- Audit trail için
```

### `api_submissions`
```sql
id              INTEGER PK
submission_date DATE NOT NULL
shift           INTEGER NOT NULL
records_count   INTEGER
oe_value        REAL
machine_count   INTEGER
total_units     INTEGER
http_status     INTEGER
response_body   TEXT
submitted_at    TIMESTAMP
retry_count     INTEGER DEFAULT 0
idempotency_key TEXT UNIQUE     -- tarih+vardiya bazlı composite key
```

---

## 5. API Endpoint Listesi

### Import
```
POST   /api/import/upload              Multipart CSV yükle (tekil)
POST   /api/import/upload-multiple     Birden fazla CSV birleştirerek yükle (tercih edilen)
GET    /api/import/batches             Import geçmişi listesi
GET    /api/import/batches/{id}        Batch detayı + özet rapor
GET    /api/import/batches/{id}/progress  Yükleme ilerleme durumu (polling)
```

### Records
```
GET    /api/records                 Filtreli kayıt listesi
                                    ?date_from, date_to, shift, station,
                                    product, oee_min, oee_max, issues_only
GET    /api/records/{id}            Tek kayıt detayı
PATCH  /api/records/{id}            Manuel düzeltme (field update)
GET    /api/records/export          CSV export (aktif filtrelerle)
```

### Validation
```
GET    /api/validation/issues            Tüm açık validation sorunları
GET    /api/validation/issues/{id}       Tek issue detayı
PATCH  /api/validation/issues/{id}       Resolve / reject / correct
GET    /api/validation/summary           Hata tipi dağılımı
GET    /api/validation/export            İndirilebilir validation raporu (Excel/CSV)
```

### Dashboard
```
GET    /api/dashboard/kpi           Özet KPI kartları
GET    /api/dashboard/oee-trend     Günlük/haftalık OEE trend
GET    /api/dashboard/by-shift      Vardiya bazlı karşılaştırma
GET    /api/dashboard/by-station    İstasyon bazlı OEE ranking
GET    /api/dashboard/quality-dist  Fire oranı dağılımı
```

### Submissions
```
POST   /api/submissions/send        Temiz kayıtları API'ye gönder
GET    /api/submissions             Gönderim geçmişi
GET    /api/submissions/{id}        Tek gönderim detayı
POST   /api/submissions/{id}/retry  Başarısız gönderimi tekrar dene
```

---

## 6. Validation Kuralları (Kritik)

CSV'deki verinin **%51.6'sı en az bir sorunla karşılaştı** (2117 satırın 1092'si).
Aşağıdaki kurallar `services/validator.py`'de implement edilecek.

Her kural şunları döner: `rule_code`, `severity`, `field_name`, `message`, `suggested_action`.

---

### VG-01 · Zorunlu Alan Eksikliği (NULL)
**Severity:** ERROR · **Action:** REJECT

Zorunlu alanlar boş/null olamaz:
- `is_emri_no` → 10 kayıt eksik
- `vardiya` → 10 kayıt eksik  
- `is_istasyon_adi` → 1 kayıt eksik

```python
MANDATORY_FIELDS = ['tarih', 'is_emri_no', 'is_istasyon_adi', 'vardiya']
if pd.isna(row[field]):
    issue(rule='VG-01', severity='error', field=field, action='reject')
```

---

### VG-02 · Opsiyonel Alan Eksikliği (Uyarı)
**Severity:** WARNING · **Action:** WARN

- `stok_adi` → 124 kayıt eksik (ürün bilinmiyor, raporlamayı etkiler)
- `is_merkezi_no` → 12 kayıt eksik

Üretim gerçekleşmiş ama ürün adı belli değil; warning ver, reddetme.

---

### VP-01a · Performance > 100 — Matematiksel Artefakt (Kısa Süre)
**Severity:** ERROR · **Action:** REJECT

**Kural:** `performance > 100` VE `calisma_suresi < 5 dakika`
**Tespit:** 144 kayıt. Vardiya başı/sonu geçiş anında makine çok kısa çalışmış,
o kısa sürede 1-2 parça üretilmiş. Performance = `gerçek_hız / ideal_hız` olduğu
için bölen (süre) çok küçük → P astronomik değerlere ulaşıyor (en yüksek: 348.500).
Bu kayıtlar anlamsız — MES'in matematiksel artefaktı, gerçek performans değil.

```python
SHORT_DURATION_THRESHOLD = 5.0  # dakika

if row['performance'] > 100 and row['calisma_suresi'] < SHORT_DURATION_THRESHOLD:
    issue(rule='VP-01a', severity='error', field='performance',
          message=(
              f'Performance {val:.2f} > 100 ve çalışma süresi {row["calisma_suresi"]:.2f} dk < 5 dk. '
              f'Kısa süre artefaktı — matematiksel olarak anlamsız değer.'
          ),
          action='reject')
```

---

### VP-01b · Performance > 100 — İdeal Hız Kalibrasyon Şüphesi
**Severity:** WARNING · **Action:** WARN

**Kural:** `performance > 100` VE `calisma_suresi >= 5 dakika`
**Tespit:** 640 kayıt, değerler genellikle 100–130 bandında.
**Domain notu:** Makine teorik ideal hızdan biraz daha hızlı çalışıyor — operatörler
cycle time'ı optimize etmiş ama MES'teki ideal hız parametresi güncellenmemiş.
Otomotiv sanayiinde bilinen bir durum; gerçek üretim verisi, red etme.
Kullanıcıya bildir, onay verdikten sonra clean olarak işaretle.

```python
if row['performance'] > 100 and row['calisma_suresi'] >= SHORT_DURATION_THRESHOLD:
    issue(rule='VP-01b', severity='warning', field='performance',
          message=(
              f'Performance {val:.2f} > 100 (normal çalışma süresi: {row["calisma_suresi"]:.2f} dk). '
              f'İdeal hız kalibrasyonu eski olabilir. Kullanıcı onayı gerekli.'
          ),
          action='warn')
```

---

### VQ-01 · Quality Aralık Dışı
**Severity:** ERROR · **Action:** REJECT

Quality 0–100 arasında olmalıdır (yüzde).
- Quality < 0 → 1 kayıt
- Quality > 100 → 4 kayıt (örn. quality=120 gibi fiziksel olarak imkânsız)

```python
if not (0 <= row['quality'] <= 100):
    issue(rule='VQ-01', severity='error', field='quality',
          message=f'Kalite yüzdesi {val} — geçerli aralık 0-100.',
          action='reject')
```

---

### VO-01 · OEE > 100
**Severity:** WARNING · **Action:** WARN

**Tespit:** 543 kayıtta OEE > 100.
**Domain notu:** OEE teorik olarak 100'ü geçemez. Ancak P>100 kaynaklı türetilmiş değer olabilir.
VP-01a veya VP-01b ile genellikle örtüşür. Birlikte işaretlenmiş kayıtlar için bu ayrıca loglanır.

---

### VC-01 · Hatalı Miktar > Üretilen Miktar
**Severity:** ERROR · **Action:** REJECT

**Kural:** `hatali_miktar > uretilen_miktar` fiziksel olarak imkânsız.
**Tespit:** 166 kayıt (en büyük sorun kategorisi!).

```python
if row['hatali_miktar'] > row['uretilen_miktar']:
    issue(rule='VC-01', severity='error', field='hatali_miktar',
          message=f'Fire {hatali} > Üretim {uretilen}. Fiziksel olarak imkânsız.',
          action='reject')
```

---

### VC-02 · Quality Formülü Tutarsızlığı
**Severity:** WARNING · **Action:** WARN

**Kural:** `Q = (uretilen - hatali) / uretilen * 100`
**Tespit:** 16 kayıtta bildirilen Q değeri formülden hesaplananla >1% sapıyor.
Bu genellikle VC-01 ile örtüşür ama bağımsız olarak da yakalanmalı.

---

### VC-03 · Negatif Miktar
**Severity:** ERROR · **Action:** REJECT

- `uretilen_miktar < 0` → 2 kayıt
- `hatali_miktar < 0` → 3 kayıt

Üretim ve fire miktarları negatif olamaz.

---

### VD-01 · Negatif Çalışma Süresi
**Severity:** ERROR · **Action:** REJECT

`calisma_suresi < 0` → 3 kayıt. Süre negatif olamaz.

---

### VD-02 · Duruş Toplamı Tutarsızlığı
**Severity:** WARNING · **Action:** WARN

**Kural:** `planli_durus + plansiz_durus ≈ toplam_durus` (±0.5 tolerans)
**Tespit:** 8 kayıtta toplam uyumsuz.
Yuvarlama hatası olabilir, ama kullanıcıya bildirilmeli.

---

### VD-03 · Sentinel/Overflow Duruş (250 dakika)
**Severity:** WARNING · **Action:** WARN

**Tespit:** 8 kayıtta `durus_suresi = 250.0` tam değeri (calisma_suresi=350).
**Domain notu:** MES sistemlerinde 250 saat/gün aşıldığında cap'leme yapılır.
Bu kayıtlar gerçek değil, MES'in overflow koruması olabilir.

```python
SENTINEL_DURUS = 250.0
if row['durus_suresi'] == SENTINEL_DURUS:
    issue(rule='VD-03', severity='warning', field='durus_suresi',
          message='Duruş süresi 250 dk — MES overflow/sentinel değeri şüphesi.',
          action='warn')
```

---

### VL-01 · Fiziksel İmkânsız: Availability=0 ama Üretim Var
**Severity:** ERROR · **Action:** REJECT

**Kural:** Makine çalışmıyorsa (`availability=0`) üretim sıfır olmalıdır.
**Tespit:** 9 kayıt.

```python
if row['availability'] == 0 and row['uretilen_miktar'] > 0:
    issue(rule='VL-01', severity='error',
          message='Availability 0 ama üretim miktarı > 0. Tutarsız.')
```

---

### VL-02 · Fiziksel İmkânsız: Çalışma Süresi=0 ama Üretim Var
**Severity:** ERROR · **Action:** REJECT

**Tespit:** 11 kayıt. `calisma_suresi=0` ama `uretilen_miktar > 0`.

---

### VL-03 · Availability Formülü Tutarsızlığı
**Severity:** WARNING · **Action:** WARN

**Kural:** `A = calisma_suresi / (calisma_suresi + plansiz_durus) * 100`
**Tespit:** 626 kayıtta bildirilen A değeri hesaplamadan >1% sapıyor.
Bu büyük sayı dikkat çekici — MES'in farklı bir Availability tanımı kullanıyor olabilir.
**Aksiyon:** Sistematik sapma mı yoksa rastgele mi analiz et; uyarı ver, hard reject yapma.

---

### VV-01 · Vardiya Aralık Dışı
**Severity:** ERROR · **Action:** REJECT

Vardiya sadece 1, 2 veya 3 olabilir. Başka değerler geçersiz.
(Bu datasette null dışında sorun yok ama kural her import için geçerli.)

---

### VF-01 · İş Emri No Format
**Severity:** WARNING · **Action:** WARN

**Kural:** İş Emri No 10 haneli, "302" ile başlamalı (örn. `3025678325`).
Bu datasette format tutarlı; gelecek importlar için savunmacı kontrol.

```python
import re
IS_EMRI_PATTERN = re.compile(r'^302\d{7}$')
if not IS_EMRI_PATTERN.match(str(val)):
    issue(rule='VF-01', severity='warning', field='is_emri_no')
```

---

### VD-04 · Duplicate Kayıt (Aynı Dosya İçi)
**Severity:** ERROR · **Action:** REJECT

Business key: `(tarih, is_emri_no, vardiya, is_istasyon_adi)`
Bu datasette duplicate yok, ama kural her import için çalışmalı.

---

### VD-05 · Çapraz-Batch Duplicate (Yeniden Yükleme)
**Severity:** WARNING · **Action:** WARN

Aynı dosya tekrar yüklendiğinde (SHA-256 kontrolü ile) kullanıcıya uyarı ver.
Batch düzeyinde file_hash karşılaştırması `import_batches` tablosunda tutulur.

---

## 7. Validation Özeti (Bu CSV)

| Kural | Açıklama | Etkilenen Kayıt | Severity |
|-------|----------|-----------------|----------|
| VG-01 | Zorunlu alan eksik | 21 | ERROR |
| VG-02 | Opsiyonel alan eksik | 124 | WARNING |
| VP-01a | Performance > 100 + süre < 5 dk (artefakt) | 144 | ERROR |
| VP-01b | Performance > 100 + süre ≥ 5 dk (kalibrasyon) | 640 | WARNING |
| VQ-01 | Quality aralık dışı | 5 | ERROR |
| VO-01 | OEE > 100 | 543 | WARNING |
| VC-01 | Hatalı > Üretilen | 166 | ERROR |
| VC-02 | Quality formül uyumsuz | 16 | WARNING |
| VC-03 | Negatif miktar | 5 | ERROR |
| VD-01 | Negatif süre | 3 | ERROR |
| VD-02 | Duruş toplamı uyumsuz | 8 | WARNING |
| VD-03 | Sentinel duruş (250) | 8 | WARNING |
| VL-01 | A=0 ama üretim var | 9 | ERROR |
| VL-02 | Süre=0 ama üretim var | 11 | ERROR |
| VL-03 | A formülü sapması | 626 | WARNING |

**Toplam etkilenen tekil kayıt:** ~1092 / 2117 (%51.6)

---

## 8. API Entegrasyon Akışı

### Aggregation Mantığı

API her gün + vardiya kombinasyonu için bir istek bekliyor (toplu değil tekil).
Yani temiz kayıtlar önce gruplandırılır:

```python
# services/api_client.py içinde
def build_submission_payload(records: list[ProductionRecord]) -> dict:
    """
    Gün + vardiya bazında aggregate edilmiş payload üretir.
    Sadece validation_status='clean' kayıtlar girebilir.
    """
    return {
        "oe_value": round(mean(r.oee for r in records), 2),     # Ortalama OEE
        "machine_count": len(set(r.is_istasyon_adi for r in records)),  # Benzersiz makine sayısı
        "shift": records[0].vardiya,
        "total_production_units": sum(r.uretilen_miktar for r in records),
        "production_date": records[0].tarih.strftime("%Y-%m-%dd")
    }
```

### Idempotency

Her gönderim için `idempotency_key = f"{production_date}_{shift}"` oluşturulur.
`api_submissions` tablosunda UNIQUE constraint var; aynı key tekrar gönderilmez.

### Retry Mekanizması

```python
MAX_RETRIES = 3
RETRY_DELAYS = [1, 5, 30]  # saniye — exponential backoff

async def send_with_retry(payload, idempotency_key):
    for attempt, delay in enumerate(RETRY_DELAYS):
        try:
            resp = await httpx.post(
                url=settings.API_ENDPOINT,
                json=payload,
                headers={"X-Production-Key": settings.API_KEY},
                timeout=30.0
            )
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 429:     # Rate limit
                await asyncio.sleep(60)
                continue
            if resp.status_code == 413:     # Payload too large — batch'i böl, retry yapma
                raise ValueError("Payload 10KB sınırını aştı. Batch boyutunu küçült.")
            if resp.status_code in (401, 422):
                raise ValueError(f"Non-retryable: {resp.status_code}")
        except httpx.TimeoutException:
            if attempt < len(RETRY_DELAYS) - 1:
                await asyncio.sleep(delay)
    raise Exception("Max retries exceeded")
```

### Background / Async Gönderim (Tercih Edilen)

Kullanıcı "Gönder" butonuna bastığında UI bloklanmamalı.
FastAPI `BackgroundTasks` veya `asyncio.create_task` ile gönderim arka planda çalışır;
kullanıcı submission ID alır, `/api/submissions/{id}` ile durumu polling yapar.

```python
# submission_router.py
@router.post("/send")
async def send_submissions(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    submission = submission_repo.create_pending(db)
    background_tasks.add_task(api_client.send_all_clean, submission.id, db)
    return {"submission_id": submission.id, "status": "processing"}
```

### Circuit Breaker (Bonus)

Ardışık 5+ hata durumunda gönderimi durdur, kullanıcıya bildir:

```python
CIRCUIT_OPEN_THRESHOLD = 5   # ardışık hata sayısı
CIRCUIT_RESET_SECONDS  = 60  # bu süre sonra half-open'a geç

# api_client.py içinde basit state machine:
# CLOSED → hata sayısı arttıkça → OPEN → 60sn sonra → HALF-OPEN → başarılı ise → CLOSED
```

### Secret Yönetimi

`.env` dosyasından okunur, kod içinde hardcode kesinlikle yasak:

```ini
# .env.example
API_ENDPOINT=http://89.252.189.91:8983/api/v1/submit
API_KEY=your-production-key-here
DATABASE_URL=sqlite:///./production.db
```

---

## 9. Environment & Kurulum

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # API key'i doldur
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

### requirements.txt (temel bağımlılıklar)
```
fastapi>=0.111
uvicorn[standard]
sqlalchemy>=2.0
pydantic-settings
pandas
httpx
python-multipart       # file upload
chardet                # encoding detection
openpyxl               # Excel export (validation raporu indirme)
pytest
pytest-asyncio
```

### Frontend package.json (temel bağımlılıklar)
```json
{
  "dependencies": {
    "react": "^18",
    "react-router-dom": "^6",
    "axios": "^1.6",
    "recharts": "^2.10",
    "zustand": "^4",
    "@tanstack/react-query": "^5",
    "react-dropzone": "^14",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "typescript": "^5",
    "vite": "^5",
    "tailwindcss": "^3",
    "@types/react": "^18"
  }
}
```

---

## 10. Kodlama Standartları

### Python
- **Type hints** her fonksiyonda zorunlu.
- Dependency injection: `Depends()` ile service/repo alınır, router'da `new` yapılmaz.
- Exception handling: domain exception sınıfları (`ValidationError`, `ImportError`) kullanılır; raw `Exception` yakalanmaz.
- `async def` her router ve I/O yoğun service fonksiyonunda kullanılır.
- String literal yerine Enum: `ValidationSeverity.ERROR`, `ValidationAction.REJECT`.

### TypeScript / React
- `any` tipi kesinlikle yasak.
- API çağrıları sadece `services/api.ts`'den yapılır; component'te `axios` çağrısı yok.
- Custom hook'lar `use` prefix ile başlar.
- Server state için React Query, UI state için Zustand.
- Component prop'ları interface ile tanımlanır.

### Genel
- Tüm commit mesajları Türkçe veya İngilizce, imperative mood.
- Her yeni servis/repo/router tamamlandıktan sonra commit.
- `.env` asla commit'lenmez.

---

## 11. Geliştirme Sırası (Öncelik)

Bölüm 6 (Veri Validasyonu) değerlendirmenin %25'i — en yüksek ağırlık.
Aşağıdaki sıra bunu gözetir:

```
1. DB şeması + modeller (csv_row_number dahil)
2. CSV parser (encoding-safe, chunk'lı okuma, sütun mapping)
3. Validator servisi (VG-01'den VL-03'e kadar tüm kurallar)
4. Import router (tekil + çoklu CSV, progress polling endpoint)
5. Validation UI (tablo, resolve, audit trail, Excel export)
6. Dashboard + filtreli kayıt ekranı (debounce)
7. API client (retry, 413 handling, background tasks, circuit breaker)
8. Submission UI + gönderim geçmişi sayfası
9. Export (CSV records), OpenAPI dokümantasyonu, README, testler
```

---

## 12. Önemli Notlar

- **CSV encoding:** Dosya Latin-1 / CP1254 ile encode edilmiş. `chardet` ile auto-detect yap, UTF-8 varsayma.
- **Performance kolonu:** 787 kayıtta >100 — ikiye bölünüyor. `calisma_suresi < 5 dk` olanlar (144) matematiksel artefakt → REJECT. Geri kalanlar (640) kalibrasyon kaynaklı → WARNING, gerçek veri.
- **Availability formülü sapması:** 626 kayıt etkileniyor. MES farklı A tanımı kullanıyor olabilir; uyarı ver, reject etme.
- **Sentinel 250:** MES'in overflow koruması gibi görünüyor — kayıtların tamamında calisma_suresi=350 ve durus_suresi=250. Belgelenmeli.
- **API aggregation:** API'ye tek kayıt gönderilmez; gün+vardiya bazında topluca aggregate edilmiş payload gönderilir.
- **%51.6 sorunlu kayıt:** Bu normal MES realitesi, şaşırtıcı değil. Validation raporu bunu net göstermeli.
- **Filtreleme debounce:** Frontend'de filtre inputları `300ms debounce` ile API'ye gönderilmeli — her tuş basışında istek atılmamalı.
- **Büyük CSV import (100K+ satır):** `pandas.read_csv(..., chunksize=5000)` ile chunk'lı okuma yapılmalı; tek seferde RAM'e yükleme yapılmamalı.
- **OpenAPI/Swagger:** FastAPI `/docs` endpoint'i otomatik açar. `app.title`, `app.description`, `app.version` doldurulmalı; README'de link verilmeli.
- **413 hata kodu:** API payload 10KB sınırını aşarsa retry yapma, batch boyutunu küçült veya kullanıcıya bildir.

---

## 13. README.md Zorunlu İçeriği

Case study teslim gereksinimi — README şu başlıkları içermeli:

```markdown
# [isim-soyisim]-uretim-takip-case

## Proje Amacı
## Hızlı Kurulum (3 komuttan az)
## Ekran Görüntüleri
  - Dashboard
  - Import ekranı
  - Validasyon raporu
  - API gönderim ekranı
## Tespit Edilen Hata Tipleri (örnekleriyle)
## API Entegrasyon Akışı
## Kullanılan Kütüphaneler ve Seçim Gerekçeleri
## Yapamadığım / Vakit Yetmeyen Kısımlar
## Daha Fazla Zaman Olsaydı Neler Yapardım?
```

> Not: README'deki kütüphane gerekçeleri değerlendirme kriterleri arasında — her bağımlılık için kısa "neden bunu seçtim" açıklaması ekle.
