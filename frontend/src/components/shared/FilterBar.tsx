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

const SHIFT_OPTIONS = [
  { value: '',  label: 'Tüm Vardiyalar' },
  { value: '1', label: '1. Vardiya' },
  { value: '2', label: '2. Vardiya' },
  { value: '3', label: '3. Vardiya' },
]

export default function FilterBar({ filters, onChange }: Props) {
  const [local, setLocal] = useState(filters)

  // 300ms debounce
  useEffect(() => {
    const t = setTimeout(() => onChange(local), 300)
    return () => clearTimeout(t)
  }, [local])  // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<RecordFilters>) =>
    setLocal((prev) => ({ ...prev, ...patch, page: 1 }))

  const reset = () => {
    const empty: RecordFilters = { page: 1, page_size: filters.page_size }
    setLocal(empty)
    onChange(empty)
  }

  const hasFilters = Object.entries(local).some(
    ([k, v]) => !['page', 'page_size'].includes(k) && v !== undefined && v !== '' && v !== false
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

        {/* Vardiya */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Vardiya</label>
          <select
            value={local.shift ?? ''}
            onChange={(e) => set({ shift: e.target.value ? Number(e.target.value) : undefined })}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SHIFT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
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
              className="border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
