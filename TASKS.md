# TASKS.md — Üretim Performans Takip Uygulaması

Tüm geliştirme görevleri ve case study gereksinimleri. Tamamlananlar `[x]` ile işaretlenir.

---

## 1. Proje Altyapısı

- [x] Dizin yapısını oluştur (`backend/`, `frontend/`, `ai_usage/`)
- [x] `backend/.env.example` dosyasını oluştur
- [x] `backend/requirements.txt` dosyasını oluştur
- [x] `frontend/package.json` bağımlılıklarını tanımla
- [x] `frontend/vite.config.ts` ve `tsconfig.json` yapılandır
- [x] `.gitignore` oluştur (`.env`, `__pycache__`, `node_modules`, `*.db`)
- [x] `docker-compose.yml` — backend + frontend servisleri

---

## 2. Veritabanı Şeması ve Modeller

- [x] `database.py` — SQLAlchemy engine, SessionLocal, Base
- [x] `models/import_batch.py` — `import_batches` tablosu (file_hash UNIQUE)
- [x] `models/production_record.py` — `production_records` tablosu (csv_row_number dahil)
- [x] `models/validation_issue.py` — `validation_issues` tablosu
- [x] `models/api_submission.py` — `api_submissions` tablosu (idempotency_key UNIQUE)
- [x] `config.py` — pydantic-settings, `.env` okuma

---

## 3. CSV Parser

- [x] `services/csv_parser.py` — chardet ile encoding auto-detect (Latin-1 / CP1254)
- [x] `pandas.read_csv(..., chunksize=5000)` ile chunk'lı okuma (100K+ satır desteği)
- [x] Sütun adı mapping — kullanıcı onaylı UI mapping + otomatik tespit (18/18 sütun)
- [x] SHA-256 file_hash hesaplama (tek noktada, tekrar hesaplanmaz)
- [x] Token tabanlı temp store (TTL: 10 dk, lazy cleanup)
- [x] Ham parse sonucu `dict` listesi olarak dön, validasyona hazırla

---

## 4. Validator Servisi (%25 — En Yüksek Ağırlık)

- [x] `services/validator.py` — `IssueData` dataclass, `validate_record()`, `determine_status()`, `worst_status()`
- [x] **VG-01** — Zorunlu alan eksikliği → ERROR / REJECT (21 kayıt)
- [x] **VG-02** — Opsiyonel alan eksikliği → WARNING / WARN (124 kayıt)
- [x] **VP-01a** — Performance > 100 + süre < 5 dk (artefakt) → ERROR / REJECT (144 kayıt)
- [x] **VP-01b** — Performance > 100 + süre ≥ 5 dk (kalibrasyon) → WARNING / WARN (640 kayıt)
- [x] **VQ-01** — Quality aralık dışı (< 0 veya > 100) → ERROR / REJECT (5 kayıt)
- [x] **VO-01** — OEE > 100 → WARNING / WARN (543 kayıt)
- [x] **VC-01** — Hatalı miktar > Üretilen miktar → ERROR / REJECT (166 kayıt)
- [x] **VC-02** — Quality formülü tutarsızlığı (>1% sapma) → WARNING / WARN (16 kayıt)
- [x] **VC-03** — Negatif miktar (üretilen veya hatalı) → ERROR / REJECT (5 kayıt)
- [x] **VD-01** — Negatif çalışma süresi → ERROR / REJECT (3 kayıt)
- [x] **VD-02** — Duruş toplamı tutarsızlığı (±0.5 tolerans) → WARNING / WARN (8 kayıt)
- [x] **VD-03** — Sentinel/overflow duruş (250.0 dk) → WARNING / WARN (8 kayıt)
- [x] **VL-01** — Availability=0 ama üretim var → ERROR / REJECT (9 kayıt)
- [x] **VL-02** — Çalışma süresi=0 ama üretim var → ERROR / REJECT (11 kayıt)
- [x] **VL-03** — Availability formülü sapması (>1%) → WARNING / WARN (626 kayıt)
- [x] **VV-01** — Vardiya aralık dışı (1/2/3 dışı) → ERROR / REJECT
- [x] **VF-01** — İş emri no format kontrolü (`^302\d{7}$`) → WARNING / WARN
- [x] **VD-04** — Aynı dosya içi duplicate (business key) → ERROR / REJECT
- [x] **VD-05** — Çapraz-batch duplicate (SHA-256 file_hash) → WARNING / WARN
- [x] Her kural için `rule_code`, `severity`, `field_name`, `message`, `suggested_action` dönüşü

---

## 5. Import Servisi ve Router

- [x] `services/import_service.py` — orchestration, duplicate check, batch yönetimi, validator entegrasyonu
- [x] `routers/import_router.py`
  - [x] `POST /api/import/preview` — CSV yükle, encoding tespiti, sütun mapping UI için hazırlık
  - [x] `POST /api/import/confirm` — mapping onayla, import başlat
  - [x] `GET /api/import/batches` — import geçmişi
  - [x] `GET /api/import/batches/{id}` — batch detayı

---

## 6. Records Router

- [x] `repositories/production_repo.py` — CRUD + export + clean unsent records
- [x] `routers/records_router.py`
  - [x] `GET /api/records` — filtreli + sayfalı liste
  - [x] `GET /api/records/{id}` — tek kayıt detayı
  - [x] `PATCH /api/records/{id}` — manuel düzeltme + audit trail
  - [x] `GET /api/records/export` — CSV export (aktif filtrelerle)

---

## 7. Validation Router

- [x] `repositories/validation_repo.py` — CRUD + summary (GROUP BY rule) + `_sync_record_status` (issue resolve → validation_status otomatik güncelleme)
- [x] `routers/validation_router.py`
  - [x] `GET /api/validation/issues` — filtreli issue listesi
  - [x] `GET /api/validation/issues/{id}` — tek issue detayı
  - [x] `PATCH /api/validation/issues/{id}` — resolve / correct (audit trail); ProductionRecord.validation_status otomatik güncellenir
  - [x] `GET /api/validation/summary` — hata tipi dağılımı
  - [x] `GET /api/validation/export` — Excel validation raporu (openpyxl)

---

## 8. Pydantic Şemaları

- [x] `schemas/production.py` — PreviewResponse, ImportBatchResponse, ProductionRecordResponse, PatchRecordRequest, RecordsPageResponse
- [x] `schemas/validation.py` — ValidationIssueResponse, ResolveIssueRequest, ValidationSummaryResponse
- [x] `schemas/submission.py` — SubmissionResponse, SendSubmissionsResponse, SubmissionsPageResponse

---

## 9. FastAPI App

- [x] `main.py` — lifespan, CORS (5173 + 4173), router mount'ları, /health endpoint

---

## 10. Dashboard Servisi ve Router

- [x] `schemas/dashboard.py` — KpiResponse, OeeTrendItem, ShiftStatItem, StationStatItem, QualityDistItem
- [x] `services/dashboard_service.py` — OEE aggregation, KPI hesaplama (rejected kayıtlar hariç)
- [x] `routers/dashboard_router.py`
  - [x] `GET /api/dashboard/kpi` — özet KPI kartları
  - [x] `GET /api/dashboard/oee-trend` — günlük OEE trend (date_from/to filtreli)
  - [x] `GET /api/dashboard/by-shift` — vardiya bazlı karşılaştırma
  - [x] `GET /api/dashboard/by-station` — istasyon bazlı OEE ranking
  - [x] `GET /api/dashboard/quality-dist` — fire oranı dağılımı

---

## 11. API Client ve Submission

- [x] `services/api_client.py`
  - [x] `build_submission_payload()` — gün+vardiya bazında aggregate
  - [x] `send_with_retry()` — 3 deneme, exponential backoff (1/5/30 sn)
  - [x] 429 (rate limit) → 60 sn bekle
  - [x] 413 (payload too large) → retry yok, hata fırlat
  - [x] 401/422 → non-retryable, hata fırlat
  - [x] Idempotency key: `"{production_date}_{shift}"`
  - [x] Circuit breaker: 5 ardışık hata → OPEN, 60 sn sonra HALF-OPEN
- [x] `repositories/submission_repo.py` — create_pending, update_result, increment_retry
- [x] `routers/submission_router.py`
  - [x] `POST /api/submissions/send` — BackgroundTasks ile async gönderim
  - [x] `GET /api/submissions` — gönderim geçmişi
  - [x] `GET /api/submissions/{id}` — tek gönderim detayı
  - [x] `POST /api/submissions/{id}/retry` — başarısız gönderimi tekrar dene

---

## 12. Frontend — Altyapı

- [x] `main.tsx` — React app entry point
- [x] `App.tsx` — router yapısı (react-router-dom v6)
- [x] `services/api.ts` — Axios instance + tüm API çağrıları
- [x] `store/filterStore.ts` — Zustand global filtre state
- [x] `types/index.ts` — shared TypeScript tipleri
- [x] Layout: `components/layout/Sidebar.tsx`, `TopBar.tsx`, `Layout.tsx`
- [x] `components/shared/StatusBadge.tsx`
- [x] `components/shared/FilterBar.tsx`, `DataTable.tsx`
- [x] `components/shared/SeverityBadge.tsx`

---

## 13. Frontend — Import Sayfası

- [x] `pages/ImportPage.tsx` — çok adımlı: upload → mapping → progress → summary
- [x] `components/import/CsvDropzone.tsx` — react-dropzone
- [x] `components/import/ColumnMappingStep.tsx` — kullanıcı onaylı sütun eşleştirme
- [x] `components/import/PreviewTable.tsx` — ilk 10 satır önizleme
- [x] `hooks/useImport.ts` — multi-file FileEntry[], per-file hash dedup, polling, async confirm

---

## 14. Frontend — Dashboard Sayfası

- [x] `pages/DashboardPage.tsx` — skeleton loading, empty state, error state
- [x] `components/dashboard/KpiCards.tsx` — 4 kart: OEE, Üretim, Fire, Kayıt Durumu
- [x] `components/dashboard/OeeTrendChart.tsx` — Recharts LineChart
- [x] `components/dashboard/ShiftComparisonChart.tsx` — Recharts BarChart
- [x] `components/dashboard/StationRankingChart.tsx` — yatay BarChart, renk kodlu
- [x] `components/dashboard/QualityDistributionChart.tsx` — Recharts BarChart
- [x] `hooks/useDashboard.ts` — React Query hooks

---

## 15. Frontend — Records Sayfası

- [x] `pages/RecordsPage.tsx` — filtreli tablo, CSV export, düzeltme modalı (audit trail)
- [x] `components/shared/FilterBar.tsx` — 300ms debounce, tarih/vardiya/durum/istasyon/issues_only
- [x] `components/shared/DataTable.tsx` — genel amaçlı, sayfalama dahil
- [x] `hooks/useRecords.ts` — useRecords (React Query), usePatchRecord (mutation)

---

## 16. Frontend — Validation Sayfası

- [x] `pages/ValidationPage.tsx` — summary cards, issue table, resolve modal, Excel export, server-side pagination
- [x] `hooks/useValidation.ts` — useValidationIssues (page/page_size), useValidationSummary, useResolveIssue

---

## 17. Frontend — Submissions Sayfası

- [x] `pages/SubmissionsPage.tsx`
- [x] Gönderim geçmişi tablosu (tarih, vardiya, OEE, durum)
- [x] Retry butonu (başarısız gönderimler için)
- [x] `hooks/useSubmissions.ts`

---

## 18. Testler

- [x] `tests/test_validator.py` — tüm validation kuralları için unit testler (pytest) — 66 test
- [x] `tests/test_import_service.py` — duplicate check, _safe_int, _safe_float, _business_key — 21 test
- [x] `tests/test_api_client.py` — retry mantığı, circuit breaker, 413 handling, payload builder — 18 test

---

## 19. Dokümantasyon ve Teslim

- [x] `backend/app/main.py` — `app.title`, `app.description`, `app.version` dolduruldu (OpenAPI/Swagger)
- [ ] `ai_usage/` — kullanıcı tarafından doldurulacak (AI konuşma exportları)
- [x] `README.md` şu bölümleri içermeli:
  - [x] Proje Amacı
  - [x] Hızlı Kurulum (3 komuttan az)
  - [x] Ekran Görüntüleri (Dashboard, Import, Validasyon, API Gönderim)
  - [x] Tespit Edilen Hata Tipleri (örnekleriyle)
  - [x] API Entegrasyon Akışı
  - [x] Kullanılan Kütüphaneler ve Seçim Gerekçeleri
  - [x] Yapamadığım / Vakit Yetmeyen Kısımlar
  - [x] Daha Fazla Zaman Olsaydı Neler Yapardım?
- [x] `data/production_data.csv` — test verisi repoda mevcut

---

## Notlar

- **Encoding:** CSV Latin-1/CP1254 — chardet ile auto-detect, UTF-8 varsayma.
- **API aggregation:** Tek kayıt değil, gün+vardiya bazında aggregate payload gönderilir.
- **413 hatası:** Retry yapılmaz, batch küçültülür veya kullanıcıya bildirilir.
- **Filtreleme:** Frontend'de 300ms debounce zorunlu.
- **Chunk okuma:** `chunksize=5000` ile pandas okuma, RAM taşması önlenir.
- **`any` yasak:** TypeScript'te strict tip zorunlu.
- **`.env` commit edilmez.**
