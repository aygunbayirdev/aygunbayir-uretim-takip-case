# TASKS.md — Üretim Performans Takip Uygulaması

Tüm geliştirme görevleri ve case study gereksinimleri. Tamamlananlar `[x]` ile işaretlenir.

---

## 1. Proje Altyapısı

- [ ] Dizin yapısını oluştur (`backend/`, `frontend/`, `ai_usage/`)
- [ ] `backend/.env.example` dosyasını oluştur
- [ ] `backend/requirements.txt` dosyasını oluştur
- [ ] `frontend/package.json` bağımlılıklarını tanımla
- [ ] `frontend/vite.config.ts` ve `tsconfig.json` yapılandır
- [ ] `.gitignore` oluştur (`.env`, `__pycache__`, `node_modules`, `*.db`)

---

## 2. Veritabanı Şeması ve Modeller

- [ ] `database.py` — SQLAlchemy engine, SessionLocal, Base
- [ ] `models/import_batch.py` — `import_batches` tablosu (file_hash UNIQUE)
- [ ] `models/production_record.py` — `production_records` tablosu (csv_row_number dahil)
- [ ] `models/validation_issue.py` — `validation_issues` tablosu
- [ ] `models/api_submission.py` — `api_submissions` tablosu (idempotency_key UNIQUE)
- [ ] `config.py` — pydantic-settings, `.env` okuma

---

## 3. CSV Parser

- [ ] `services/csv_parser.py` — chardet ile encoding auto-detect (Latin-1 / CP1254)
- [ ] `pandas.read_csv(..., chunksize=5000)` ile chunk'lı okuma (100K+ satır desteği)
- [ ] Sütun adı mapping (CSV başlıkları → ORM field'ları)
- [ ] Ham parse sonucu `dict` listesi olarak dön, validasyona hazırla

---

## 4. Validator Servisi (%25 — En Yüksek Ağırlık)

- [ ] `services/validator.py` — temel iskelet, `ValidationIssue` dataclass
- [ ] **VG-01** — Zorunlu alan eksikliği → ERROR / REJECT (21 kayıt)
- [ ] **VG-02** — Opsiyonel alan eksikliği → WARNING / WARN (124 kayıt)
- [ ] **VP-01a** — Performance > 100 + süre < 5 dk (artefakt) → ERROR / REJECT (144 kayıt)
- [ ] **VP-01b** — Performance > 100 + süre ≥ 5 dk (kalibrasyon) → WARNING / WARN (640 kayıt)
- [ ] **VQ-01** — Quality aralık dışı (< 0 veya > 100) → ERROR / REJECT (5 kayıt)
- [ ] **VO-01** — OEE > 100 → WARNING / WARN (543 kayıt)
- [ ] **VC-01** — Hatalı miktar > Üretilen miktar → ERROR / REJECT (166 kayıt)
- [ ] **VC-02** — Quality formülü tutarsızlığı (>1% sapma) → WARNING / WARN (16 kayıt)
- [ ] **VC-03** — Negatif miktar (üretilen veya hatalı) → ERROR / REJECT (5 kayıt)
- [ ] **VD-01** — Negatif çalışma süresi → ERROR / REJECT (3 kayıt)
- [ ] **VD-02** — Duruş toplamı tutarsızlığı (±0.5 tolerans) → WARNING / WARN (8 kayıt)
- [ ] **VD-03** — Sentinel/overflow duruş (250.0 dk) → WARNING / WARN (8 kayıt)
- [ ] **VL-01** — Availability=0 ama üretim var → ERROR / REJECT (9 kayıt)
- [ ] **VL-02** — Çalışma süresi=0 ama üretim var → ERROR / REJECT (11 kayıt)
- [ ] **VL-03** — Availability formülü sapması (>1%) → WARNING / WARN (626 kayıt)
- [ ] **VV-01** — Vardiya aralık dışı (1/2/3 dışı) → ERROR / REJECT
- [ ] **VF-01** — İş emri no format kontrolü (`^302\d{7}$`) → WARNING / WARN
- [ ] **VD-04** — Aynı dosya içi duplicate (business key) → ERROR / REJECT
- [ ] **VD-05** — Çapraz-batch duplicate (SHA-256 file_hash) → WARNING / WARN
- [ ] Her kural için `rule_code`, `severity`, `field_name`, `message`, `suggested_action` dönüşü

---

## 5. Import Servisi ve Router

- [ ] `repositories/production_repo.py` — CRUD
- [ ] `repositories/validation_repo.py` — CRUD
- [ ] `services/import_service.py` — orchestration, duplicate check, batch yönetimi
- [ ] `routers/import_router.py`
  - [ ] `POST /api/import/upload` — tekil CSV yükle
  - [ ] `POST /api/import/upload-multiple` — çoklu CSV birleştir
  - [ ] `GET /api/import/batches` — import geçmişi
  - [ ] `GET /api/import/batches/{id}` — batch detayı + özet rapor
  - [ ] `GET /api/import/batches/{id}/progress` — ilerleme polling endpoint

---

## 6. Records Router

- [ ] `routers/records_router.py`
  - [ ] `GET /api/records` — filtreli liste (`date_from`, `date_to`, `shift`, `station`, `product`, `oee_min`, `oee_max`, `issues_only`)
  - [ ] `GET /api/records/{id}` — tek kayıt detayı
  - [ ] `PATCH /api/records/{id}` — manuel düzeltme
  - [ ] `GET /api/records/export` — CSV export (aktif filtrelerle)

---

## 7. Validation Router

- [ ] `routers/validation_router.py`
  - [ ] `GET /api/validation/issues` — tüm açık sorunlar
  - [ ] `GET /api/validation/issues/{id}` — tek issue detayı
  - [ ] `PATCH /api/validation/issues/{id}` — resolve / reject / correct (audit trail)
  - [ ] `GET /api/validation/summary` — hata tipi dağılımı
  - [ ] `GET /api/validation/export` — Excel/CSV validation raporu indirme (openpyxl)

---

## 8. Dashboard Servisi ve Router

- [ ] `services/dashboard_service.py` — OEE aggregation, KPI hesaplama
- [ ] `routers/dashboard_router.py`
  - [ ] `GET /api/dashboard/kpi` — özet KPI kartları
  - [ ] `GET /api/dashboard/oee-trend` — günlük/haftalık OEE trend
  - [ ] `GET /api/dashboard/by-shift` — vardiya bazlı karşılaştırma
  - [ ] `GET /api/dashboard/by-station` — istasyon bazlı OEE ranking
  - [ ] `GET /api/dashboard/quality-dist` — fire oranı dağılımı

---

## 9. API Client ve Submission

- [ ] `services/api_client.py`
  - [ ] `build_submission_payload()` — gün+vardiya bazında aggregate
  - [ ] `send_with_retry()` — 3 deneme, exponential backoff (1/5/30 sn)
  - [ ] 429 (rate limit) → 60 sn bekle
  - [ ] 413 (payload too large) → retry yok, hata fırlat
  - [ ] 401/422 → non-retryable, hata fırlat
  - [ ] Idempotency key: `"{production_date}_{shift}"`
  - [ ] Circuit breaker: 5 ardışık hata → OPEN, 60 sn sonra HALF-OPEN
- [ ] `repositories/submission_repo.py` — CRUD
- [ ] `routers/submission_router.py`
  - [ ] `POST /api/submissions/send` — BackgroundTasks ile async gönderim
  - [ ] `GET /api/submissions` — gönderim geçmişi
  - [ ] `GET /api/submissions/{id}` — tek gönderim detayı
  - [ ] `POST /api/submissions/{id}/retry` — başarısız gönderimi tekrar dene

---

## 10. Pydantic Şemaları

- [ ] `schemas/production.py` — request/response DTO'ları
- [ ] `schemas/validation.py` — ValidationReport, ValidationIssue şemaları
- [ ] `schemas/submission.py` — ApiSubmission şemaları

---

## 11. Frontend — Altyapı

- [ ] `main.tsx` — React app entry point
- [ ] `App.tsx` — router yapısı (react-router-dom v6)
- [ ] `services/api.ts` — Axios instance + tüm API çağrıları
- [ ] `store/filterStore.ts` — Zustand global filtre state
- [ ] `types/index.ts` — shared TypeScript tipleri
- [ ] Layout: `components/layout/Sidebar.tsx` ve `TopBar.tsx`
- [ ] `components/shared/FilterBar.tsx`, `DataTable.tsx`, `StatusBadge.tsx`

---

## 12. Frontend — Import Sayfası

- [ ] `pages/ImportPage.tsx`
- [ ] `components/import/CsvDropzone.tsx` — react-dropzone
- [ ] `components/import/PreviewTable.tsx`
- [ ] `components/import/ImportProgress.tsx` — polling ile ilerleme çubuğu
- [ ] `components/import/ImportSummary.tsx`
- [ ] `hooks/useImport.ts`

---

## 13. Frontend — Dashboard Sayfası

- [ ] `pages/DashboardPage.tsx`
- [ ] `components/dashboard/KpiCards.tsx`
- [ ] `components/dashboard/OeeTrendChart.tsx` — Recharts
- [ ] `components/dashboard/ShiftComparisonChart.tsx` — Recharts
- [ ] `components/dashboard/StationRankingChart.tsx` — Recharts
- [ ] `components/dashboard/QualityDistributionChart.tsx` — Recharts
- [ ] `hooks/useDashboard.ts`

---

## 14. Frontend — Records Sayfası

- [ ] `pages/RecordsPage.tsx`
- [ ] Filtreli tablo: `date_from`, `date_to`, `shift`, `station`, `oee_min/max`, `issues_only`
- [ ] 300ms debounce ile filtre inputları
- [ ] CSV export butonu
- [ ] `hooks/useRecords.ts`

---

## 15. Frontend — Validation Sayfası

- [ ] `pages/ValidationPage.tsx`
- [ ] `components/validation/ValidationReportTable.tsx`
- [ ] `components/validation/EditRecordModal.tsx`
- [ ] `components/validation/AuditTrailDrawer.tsx`
- [ ] Excel/CSV validation raporu indirme butonu
- [ ] `hooks/useValidation.ts`

---

## 16. Frontend — Submissions Sayfası

- [ ] `pages/SubmissionsPage.tsx`
- [ ] Gönderim geçmişi tablosu (tarih, vardiya, OEE, durum)
- [ ] Retry butonu (başarısız gönderimler için)
- [ ] `hooks/useSubmissions.ts`

---

## 17. Testler

- [ ] `tests/test_validator.py` — tüm validation kuralları için unit testler (pytest)
- [ ] `tests/test_import_service.py` — duplicate check, batch oluşturma
- [ ] `tests/test_api_client.py` — retry mantığı, circuit breaker, 413 handling

---

## 18. Dokümantasyon ve Teslim

- [ ] `backend/app/main.py` — `app.title`, `app.description`, `app.version` doldur (OpenAPI/Swagger)
- [ ] `ai_usage/01_project_planning.md` — AI kullanım şeffaflığı belgesi
- [ ] `README.md` şu bölümleri içermeli:
  - [ ] Proje Amacı
  - [ ] Hızlı Kurulum (3 komuttan az)
  - [ ] Ekran Görüntüleri (Dashboard, Import, Validasyon, API Gönderim)
  - [ ] Tespit Edilen Hata Tipleri (örnekleriyle)
  - [ ] API Entegrasyon Akışı
  - [ ] Kullanılan Kütüphaneler ve Seçim Gerekçeleri
  - [ ] Yapamadığım / Vakit Yetmeyen Kısımlar
  - [ ] Daha Fazla Zaman Olsaydı Neler Yapardım?
- [ ] `data/production_data.csv` — test verisi repoda mevcut

---

## Notlar

- **Encoding:** CSV Latin-1/CP1254 — chardet ile auto-detect, UTF-8 varsayma.
- **API aggregation:** Tek kayıt değil, gün+vardiya bazında aggregate payload gönderilir.
- **413 hatası:** Retry yapılmaz, batch küçültülür veya kullanıcıya bildirilir.
- **Filtreleme:** Frontend'de 300ms debounce zorunlu.
- **Chunk okuma:** `chunksize=5000` ile pandas okuma, RAM taşması önlenir.
- **`any` yasak:** TypeScript'te strict tip zorunlu.
- **`.env` commit edilmez.**
