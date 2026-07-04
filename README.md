# aygunbayir-uretim-takip-case

ACME Automotive injection molding hattı için OEE (Overall Equipment Effectiveness) takip uygulaması.  
MES sisteminden gelen CSV verisi import edilir, 19 farklı kural (17 iş/içerik kuralı, 2 duplicate/import kuralı) ile validate edilir, dashboard'da görselleştirilir ve REST API'ye gönderilir.

---

## Proje Amacı

Üretim hatlarından gelen ham MES verisindeki kalite sorunlarını otomatik olarak tespit etmek, operatörlere anlamlı bir validation raporu sunmak ve temiz kayıtları hedef sisteme güvenli biçimde iletmektir.

Gerçek bir CSV dataseti analiz edilerek 2117 kayıtın %51.6'sının en az bir veri kalitesi sorunu içerdiği tespit edilmiş; veri bütünlüğünü sağlamak adına 2 farklı katmanda toplam 19 validation kuralı (Import aşamasında 2 duplicate kuralı, Validator servisinde 17 iş kuralı) implement edilmiştir.

---

## Hızlı Kurulum

### Docker ile (önerilen — 3 komut)

```bash
git clone https://github.com/aygunbayirdev/aygunbayir-uretim-takip-case.git
cd aygunbayir-uretim-takip-case
cp backend/.env.example backend/.env   # API_KEY ve API_ENDPOINT'i doldur
docker compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- Swagger UI: http://localhost:8000/docs

### Manuel kurulum

```bash
git clone https://github.com/aygunbayirdev/aygunbayir-uretim-takip-case.git
cd aygunbayir-uretim-takip-case

# Backend
cd backend
cp .env.example .env          # API key'i .env dosyasına gir
pip install -r requirements.txt
alembic upgrade head          # DB migration uygula
uvicorn app.main:app --reload --port 8000

# Frontend (yeni terminal)
cd frontend
npm install
npm run dev
```

---

## Ekran Görüntüleri

### Dashboard

> OEE trend grafiği, vardiya/istasyon karşılaştırması ve KPI kartları.

![Dashboard](screenshots/dashboard.png)

### Import Ekranı

> CSV sürükle-bırak, sütun eşleştirme ve import özeti.

![Import](screenshots/import.png)

### Validasyon Raporu

> Hata tipi filtreleme, severity'e göre iki farklı çözüm akışı ve Excel export.

![Validation](screenshots/validation.png)

### API Gönderim Ekranı

> Gönderim geçmişi, HTTP durum kodu, yanıt detayı ve retry butonu.

![Submissions](screenshots/submissions.png)

---

## Validasyon Çözüm Akışı

Validation issues iki farklı akışla çözülür — severity'e göre otomatik ayrılır:

### ERROR → Veriyi Düzelt ve Çöz

Fiziksel olarak imkânsız veya eksik veri içeren kayıtlar için kullanılır. Tabloda bu kayıtların butonu **"Düzelt"** olarak görünür.

1. "Düzelt" butonuna tıkla
2. Modal açılır; sorunlu alan(lar) mevcut değerleriyle editable input olarak gelir
   - `hatali_miktar`, `uretilen_miktar` → sayı inputu (tamsayı)
   - `performance`, `quality`, `availability` → sayı inputu (ondalıklı)
   - `tarih` → tarih seçici
   - `vardiya` → dropdown (1/2/3)
   - `is_emri_no`, `is_istasyon_adi` vb. → metin inputu
3. Değeri düzelt, düzeltme notu gir
4. "Düzelt ve Çöz" → `PATCH /api/records/{id}` + `PATCH /api/validation/issues/{id}`

Örnek kullanım senaryoları:
- **VC-01** (`hatali > üretilen`): hatalı miktar düzeltilir
- **VG-01** (zorunlu alan boş): eksik alan doldurulur
- **VC-03** (negatif miktar): doğru değer girilir

### WARNING → İncele ve Onayla

Veri şüpheli ama gerçek olabilecek kayıtlar için kullanılır (kalibrasyon kaynaklı P>100, MES formül sapması vb.). Tabloda **"Onayla"** butonu görünür.

1. "Onayla" butonuna tıkla
2. İsteğe bağlı: Çözen Kişi + Onay notu gir
3. "Onayla" → `PATCH /api/validation/issues/{id}` (issue resolved=true)

Veri değişmez; insan kararıyla kabul edildiği kayıt altına alınır (audit trail).

---

## Tespit Edilen Hata Tipleri

Datasette karşılaşılan başlıca sorunlar ve etkilenen kayıt sayıları:

| Kural | Açıklama | Etkilenen | Severity |
|-------|----------|-----------|----------|
| **VP-01b** | Performance > 100, süre ≥ 5 dk — ideal hız kalibrasyonu eski | 640 | WARNING |
| **VL-03** | Availability formül sapması (MES farklı tanım kullanıyor olabilir) | 626 | WARNING |
| **VO-01** | OEE > 100 — VP-01a/b kaynaklı türetilmiş değer | 543 | WARNING |
| **VC-01** | Hatalı miktar > Üretilen miktar — fiziksel olarak imkânsız | 166 | **ERROR** |
| **VP-01a** | Performance > 100, süre < 5 dk — vardiya geçiş artefaktı | 144 | **ERROR** |
| **VG-02** | Opsiyonel alan eksik (stok_adi, is_merkezi_no) | 124 | WARNING |
| **VG-01** | Zorunlu alan boş (is_emri_no, vardiya, is_istasyon_adi) | 21 | **ERROR** |
| **VC-02** | Quality formül tutarsızlığı (> %1 sapma) | 16 | WARNING |
| **VL-02** | Çalışma süresi = 0 ama üretim > 0 | 11 | **ERROR** |
| **VL-01** | Availability = 0 ama üretim > 0 | 9 | **ERROR** |
| **VD-02** | Duruş toplamı tutarsızlığı (±0.5 dk tolerans dışı) | 8 | WARNING |
| **VD-03** | Duruş süresi tam 250 dk — MES overflow/sentinel değeri şüphesi | 8 | WARNING |
| **VQ-01** | Quality aralık dışı (< 0 veya > 100) | 5 | **ERROR** |
| **VC-03** | Negatif miktar (üretilen veya hatalı) | 5 | **ERROR** |
| **VD-01** | Negatif çalışma süresi | 3 | **ERROR** |
| **VV-01** | Vardiya değeri geçersiz (1, 2, 3 dışı) | - | **ERROR** |
| **VF-01** | İş emri no format dışı (302XXXXXXX bekleniyor) | - | WARNING |
| **VD-04** | Dosya içi mükerrer (duplicate) kayıt tespiti | - | **ERROR** |
| **VD-05** | Çapraz-batch mükerrer (önceden yüklenmiş) kayıt tespiti | - | WARNING |

**Dikkat çekici bulgular:**
- **VP-01a (artefakt):** Vardiya başı/sonu geçişinde makine çok kısa çalışıp 1-2 parça üretiyor; `Performance = gerçek_hız / ideal_hız` formülünde bölen (süre) çok küçük olduğu için değer 300+ çıkabiliyor. Bu kayıtlar reddedilir.
- **VD-03 (sentinel 250):** Bu değere sahip kayıtların tamamında `calisma_suresi = 350.0`. MES'in cap/overflow koruması olduğu şüpheleniliyor — uyarı verilir, reddedilmez.
- **VL-03 (626 kayıt):** Çok yüksek sayı, sistematik bir sapma. MES'in Availability hesabında `planli_durus`'u da payda dahil ettiği düşünülüyor.

---

## API Entegrasyon Akışı

API, tek kayıt değil **gün + vardiya bazında aggregate edilmiş** payload bekliyor.

```
Temiz kayıtlar (validation_status='clean', is_sent=0)
    ↓
Tarih + Vardiya bazında gruplandır
    ↓ (her grup için)
Payload oluştur:
  oe_value              = grup OEE ortalaması
  machine_count         = benzersiz istasyon sayısı
  shift                 = vardiya (1/2/3)
  total_production_units = toplam üretilen miktar
  production_date       = YYYY-MM-DD
    ↓
POST /api/v1/submit
  Headers: X-Production-Key
    ↓
Retry (max 3, backoff: 1s → 5s → 30s)
  429 → 60s bekle
  413 → retry yok, batch küçült
  401/422 → non-retryable, hata fırlat
    ↓
Circuit Breaker: 5 ardışık hata → OPEN (60s sonra HALF-OPEN)
```

Gönderim arka planda (`BackgroundTasks`) çalışır; UI bloklanmaz. Her gönderim `idempotency_key = "{tarih}_{vardiya}"` ile tekilleştirilir.

---

## Kullanılan Kütüphaneler ve Seçim Gerekçeleri

### Backend

| Kütüphane | Seçim Gerekçesi |
|-----------|----------------|
| **FastAPI** | Otomatik OpenAPI/Swagger, `async def` desteği, `Depends()` ile temiz dependency injection — `.NET Minimal API` ile benzer ergonomi |
| **SQLAlchemy 2.0** | ORM-first yaklaşım, type-safe query API; raw SQL yazılmadan karmaşık filtreleme yapılabiliyor |
| **Pydantic v2 + pydantic-settings** | Request/response DTO doğrulama ve `.env` okuma tek kütüphaneyle; `.NET`'teki `IOptions<T>` pattern'ına karşılık geliyor |
| **pandas** | `chunksize=5000` ile 100K+ satırı RAM taşması olmadan okuyabiliyor; CSV encoding ve tip dönüşümlerini kolaylaştırıyor |
| **chardet** | CSV Latin-1/CP1254 encode — UTF-8 varsayımı Türkçe karakterleri bozuyor; otomatik encoding tespiti için şart |
| **httpx** | `async`-native HTTP client; `AsyncClient` ile retry döngüsünü `asyncio` ile doğal yazabiliyoruz |
| **openpyxl** | Validation raporu Excel export; pandas `to_excel()` backend'i olarak kullanılıyor |
| **pytest + pytest-asyncio** | `asyncio_mode=auto` ile async test fonksiyonları ayrıca decorator gerektirmiyor |

### Frontend

| Kütüphane | Seçim Gerekçesi |
|-----------|----------------|
| **React 18 + TypeScript** | Strict tip güvenliği; `any` kullanılmıyor, tüm API response'ları arayüzle eşleşiyor |
| **Vite** | Dev server saniyeler içinde kalkıyor; HMR (Hot Module Replacement) geliştirme hızını artırıyor |
| **React Router v6** | Nested route + `<Outlet />` ile Layout bir kez yazılıp tüm sayfalara uygulanıyor |
| **@tanstack/react-query v5** | Server state cache yönetimi; `refetchInterval` ile gönderim durumu polling otomatik — elle `useEffect` yazmaya gerek kalmıyor |
| **Zustand** | Global filtre state için Redux'tan çok daha az boilerplate; tek `store.ts` dosyasıyla yönetiliyor |
| **Recharts** | React-native chart kütüphanesi; `<Cell>` ile her bar farklı renk (OEE < 50% kırmızı, < 75% amber, ≥ 75% yeşil) kolayca uygulanabiliyor |
| **Axios** | Tek `api.ts` instance'ı ile `baseURL` ve timeout merkezi yönetimi; tüm namespace'ler buradan geçiyor |
| **react-dropzone** | CSV sürükle-bırak ve dosya validasyonu; `accept` prop ile yalnızca `.csv` kabul ediliyor |
| **lucide-react** | Tree-shakeable SVG icon seti; bundle'a yalnızca kullanılan ikonlar giriyor |
| **Tailwind CSS v3** | Utility-first; harici component kütüphanesi (shadcn/ui vb.) bağımlılığı olmadan tutarlı tasarım |

---

## Yapamadığım / Vakit Yetmeyen Kısımlar

- **Docker production build:** Frontend `Dockerfile` dev server (`npm run dev`) çalıştırıyor; production için `nginx` + `npm run build` konfigürasyonu yapılmadı.
- **Persistent circuit breaker state:** Circuit breaker in-memory tutulduğu için backend yeniden başlatılınca sıfırlanıyor; kalıcı durum için Redis veya DB tabanlı bir çözüm gerekir.

---

## Daha Fazla Zaman Olsaydı Neler Yapardım?

- **Alembic migration testi:** Migration'lar autogenerate ile oluşturuluyor; `downgrade` senaryoları ve çoklu ortam testleri yazılabilirdi.
- **Validation re-validation:** ERROR kaydı düzeltildikten sonra backend otomatik olarak ilgili kuralı yeniden çalıştırmıyor; kullanıcı hatalı bir değer girerse issue manuel olarak tekrar açılması gerekiyor. `PATCH /api/records/{id}` endpoint'ine `re_validate=true` flag'i eklenerek bu otomatikleştirilebilirdi.
- **Frontend entegrasyon testleri:** Vitest + MSW ile kritik page-level senaryolar (ValidationPage, ImportPage) uçtan uca test edilirdi; şu an birim testler mevcut (46 test) ama sayfa akışları kapsanmıyor.
- **WebSocket ile live update:** Polling yerine WebSocket ile gönderim ve import durumunu anlık güncellemek daha iyi UX sağlardı.
- **Role-based access:** Operatör / supervisor ayrımı — supervisor olmadan validation issue'ları resolve edilememesi gibi iş kuralları eklenebilirdi.
- **CSV template export:** Kullanıcının boş bir CSV şablonu indirip doldurabilmesi, import hatalarını peşinen azaltırdı.
- **Scheduled submission:** Belirli bir saatte (örn. vardiya sonu 06:00/14:00/22:00) temiz kayıtların otomatik gönderilmesi için APScheduler entegrasyonu yapılabilirdi.
