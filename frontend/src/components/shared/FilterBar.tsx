import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import type { RecordFilters, ValidationStatus } from '../../types'

interface Props {
  filters: RecordFilters
  onChange: (filters: RecordFilters) => void
}

const STATUS_OPTIONS: { value: ValidationStatus | ''; label: string }[] = [
  { value: '',         label: 'Tüm Durumlar' },
  { value: 'clean',    label: 'Temiz' },
  { value: 'warning',  label: 'Uyarı' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'pending',  label: 'Bekliyor' },
]

const SHIFTS = [1, 2, 3]

export default function FilterBar({ filters, onChange }: Props) {
  const [local, setLocal] = useState(filters)

  // 300ms debounce
  useEffect(() => {
    const t = setTimeout(() => onChange(local), 300)
    return () => clearTimeout(t)
  }, [local])  // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<RecordFilters>) =>
    setLocal((prev) => ({ ...prev, ...patch, page: 1 }))

  const toggleShift = (s: number) => {
    const current = local.shift ?? []
    const next = current.includes(s) ? current.filter((v) => v !== s) : [...current, s]
    set({ shift: next.length > 0 ? next : undefined })
  }

  const reset = () => {
    const empty: RecordFilters = { page: 1, page_size: filters.page_size }
    setLocal(empty)
    onChange(empty)
  }

  const hasFilters = Object.entries(local).some(
    ([k, v]) => {
      if (['page', 'page_size'].includes(k)) return false
      if (Array.isArray(v)) return v.length > 0
      return v !== undefined && v !== '' && v !== false
    }
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Tarih aralığı */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Başlangıç</label>
          <input
            type="date"
            value={local.date_from ?? ''}
            onChange={(e) => set({ date_from: e.target.value || undefined })}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Bitiş</label>
          <input
            type="date"
            value={local.date_to ?? ''}
            onChange={(e) => set({ date_to: e.target.value || undefined })}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Vardiya — çoklu seçim */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Vardiya</label>
          <div className="flex gap-1">
            {SHIFTS.map((s) => {
              const active = (local.shift ?? []).includes(s)
              return (
                <button
                  key={s}
                  onClick={() => toggleShift(s)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* Durum */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Durum</label>
          <select
            value={local.validation_status ?? ''}
            onChange={(e) => set({ validation_status: (e.target.value as ValidationStatus) || undefined })}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* İstasyon arama */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">İstasyon</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="İstasyon ara..."
              value={local.station ?? ''}
              onChange={(e) => set({ station: e.target.value || undefined })}
              className="border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Ürün / Stok Adı */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Ürün</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Ürün ara..."
              value={local.product ?? ''}
              onChange={(e) => set({ product: e.target.value || undefined })}
              className="border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* OEE aralığı */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">OEE (%)</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="Min"
              min={0}
              max={100}
              value={local.oee_min ?? ''}
              onChange={(e) => set({ oee_min: e.target.value ? Number(e.target.value) : undefined })}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-xs">–</span>
            <input
              type="number"
              placeholder="Max"
              min={0}
              max={100}
              value={local.oee_max ?? ''}
              onChange={(e) => set({ oee_max: e.target.value ? Number(e.target.value) : undefined })}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sadece sorunlu */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Filtre</label>
          <label className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={local.issues_only ?? false}
              onChange={(e) => set({ issues_only: e.target.checked || undefined })}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Sadece sorunlu</span>
          </label>
        </div>

        {/* Sıfırla */}
        {hasFilters && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X size={14} />
            Sıfırla
          </button>
        )}
      </div>
    </div>
  )
}
