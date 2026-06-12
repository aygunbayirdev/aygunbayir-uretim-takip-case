import { useState } from 'react'
import { Download, X, Save } from 'lucide-react'
import { useRecords, usePatchRecord } from '../hooks/useRecords'
import FilterBar from '../components/shared/FilterBar'
import DataTable, { type Column } from '../components/shared/DataTable'
import StatusBadge from '../components/shared/StatusBadge'
import { recordsApi } from '../services/api'
import type { ProductionRecord, RecordFilters } from '../types'

const PAGE_SIZE = 50

const COLUMNS: Column<ProductionRecord>[] = [
  { key: 'id',              header: 'ID',        className: 'w-16' },
  { key: 'tarih',           header: 'Tarih' },
  { key: 'is_istasyon_adi', header: 'İstasyon' },
  { key: 'stok_adi',        header: 'Ürün',      render: (r) => r.stok_adi ?? '—' },
  { key: 'vardiya',         header: 'Vardiya',   render: (r) => r.vardiya ? `${r.vardiya}. Vardiya` : '—' },
  { key: 'oee',             header: 'OEE',       render: (r) => r.oee != null ? `${r.oee}%` : '—' },
  { key: 'availability',    header: 'A%',        render: (r) => r.availability != null ? `${r.availability}%` : '—' },
  { key: 'performance',     header: 'P%',        render: (r) => r.performance != null ? `${r.performance}%` : '—' },
  { key: 'quality',         header: 'Q%',        render: (r) => r.quality != null ? `${r.quality}%` : '—' },
  { key: 'uretilen_miktar', header: 'Üretilen',  render: (r) => r.uretilen_miktar?.toLocaleString('tr-TR') ?? '—' },
  { key: 'hatali_miktar',   header: 'Hatalı',    render: (r) => r.hatali_miktar?.toLocaleString('tr-TR') ?? '—' },
  {
    key: 'validation_status',
    header: 'Durum',
    render: (r) => <StatusBadge status={r.validation_status} />,
  },
]

export default function RecordsPage() {
  const [filters, setFilters] = useState<RecordFilters>({ page: 1, page_size: PAGE_SIZE })
  const [selected, setSelected] = useState<ProductionRecord | null>(null)
  const [correctionNote, setCorrectionNote] = useState('')

  const { data, isLoading } = useRecords(filters)
  const patch = usePatchRecord()

  const handleExport = () => {
    const url = recordsApi.exportUrl(filters)
    window.open(url, '_blank')
  }

  const handleSave = async () => {
    if (!selected || !correctionNote.trim()) return
    await patch.mutateAsync({ id: selected.id, body: { correction_note: correctionNote } })
    setSelected(null)
    setCorrectionNote('')
  }

  return (
    <div className="space-y-4">
      {/* Filtreler + Export */}
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <FilterBar filters={filters} onChange={setFilters} />
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shrink-0 mt-0.5"
        >
          <Download size={15} />
          CSV İndir
        </button>
      </div>

      {/* Tablo */}
      <DataTable
        columns={COLUMNS}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={filters.page ?? 1}
        pageSize={PAGE_SIZE}
        onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
        onRowClick={(row) => { setSelected(row); setCorrectionNote('') }}
        loading={isLoading}
        keyExtractor={(r) => r.id}
      />

      {/* Düzeltme Modalı */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Kayıt Detayı — #{selected.id}</h2>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Tarih"    value={selected.tarih} />
                <Detail label="Vardiya"  value={selected.vardiya ? `${selected.vardiya}. Vardiya` : '—'} />
                <Detail label="İstasyon" value={selected.is_istasyon_adi} />
                <Detail label="Ürün"     value={selected.stok_adi} />
                <Detail label="OEE"      value={selected.oee != null ? `${selected.oee}%` : '—'} />
                <Detail label="Durum"    value={<StatusBadge status={selected.validation_status} />} />
                <Detail label="Üretilen" value={selected.uretilen_miktar?.toLocaleString('tr-TR')} />
                <Detail label="Hatalı"   value={selected.hatali_miktar?.toLocaleString('tr-TR')} />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Düzeltme Notu (audit trail)
                </label>
                <textarea
                  rows={3}
                  placeholder="Yapılan düzeltme veya açıklama..."
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={!correctionNote.trim() || patch.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={15} />
                {patch.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-gray-800 font-medium">{value ?? '—'}</p>
    </div>
  )
}
