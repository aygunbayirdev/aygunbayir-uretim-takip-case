import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':   { title: 'Dashboard',       subtitle: 'OEE özeti ve üretim metrikleri' },
  '/import':      { title: 'Veri İçe Aktar',  subtitle: 'MES CSV dosyası yükle ve doğrula' },
  '/records':     { title: 'Kayıtlar',         subtitle: 'Filtreli üretim kayıt listesi' },
  '/validation':  { title: 'Validasyon',       subtitle: 'Veri kalite sorunları ve düzeltmeler' },
  '/submissions': { title: 'API Gönderim',     subtitle: 'Temiz kayıtların hedef sisteme iletimi' },
}

export default function TopBar() {
  const { pathname } = useLocation()
  const page = PAGE_TITLES[pathname] ?? { title: 'OEE Takip', subtitle: '' }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{page.title}</h1>
        {page.subtitle && (
          <p className="text-sm text-gray-500 mt-0.5">{page.subtitle}</p>
        )}
      </div>
    </header>
  )
}
