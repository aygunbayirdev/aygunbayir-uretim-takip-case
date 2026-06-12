import { useState } from 'react'
import type { ColumnInfo, ColumnMappingItem, TargetField } from '../../types'
import { FIELD_LABELS } from '../../types'
import PreviewTable from './PreviewTable'

const ALL_TARGET_FIELDS: TargetField[] = [
  'record_id', 'tarih', 'is_emri_no', 'is_merkezi_no', 'ismerkezi_adi',
  'is_istasyon_adi', 'stok_adi', 'vardiya', 'availability', 'performance',
  'quality', 'oee', 'calisma_suresi', 'durus_suresi', 'planli_durus',
  'plansiz_durus', 'uretilen_miktar', 'hatali_miktar', 'ignore',
]

interface Props {
  columns: ColumnInfo[]
  sampleRows: Record<string, string>[]
  duplicateBatchId: number | null
  onConfirm: (mapping: ColumnMappingItem[]) => void
  onBack: () => void
  loading: boolean
}

export default function ColumnMappingStep({ columns, sampleRows, duplicateBatchId, onConfirm, onBack, loading }: Props) {
  const [mapping, setMapping] = useState<Record<string, TargetField>>(() =>
    Object.fromEntries(
      columns.map((col) => [col.csv_name, col.suggested_field ?? 'ignore'])
    )
  )

  const setField = (csvName: string, value: TargetField) => {
    setMapping((prev) => ({ ...prev, [csvName]: value }))
  }

  const handleConfirm = () => {
    const items: ColumnMappingItem[] = columns.map((col) => ({
      csv_column: col.csv_name,
      target_field: mapping[col.csv_name] ?? 'ignore',
    }))
    onConfirm(items)
  }

  const mappedFields = Object.values(mapping).filter((v) => v !== 'ignore')
  const duplicates = mappedFields.filter((v, i) => mappedFields.indexOf(v) !== i)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Sütun Eşleştirme</h2>
        <p className="text-sm text-gray-500 mt-1">
          CSV'deki her sütunu karşılık gelen alana eşleştirin. Otomatik tespit öneriler sunulmuştur.
        </p>
      </div>

      {sampleRows.length > 0 && <PreviewTable rows={sampleRows} />}

      {duplicateBatchId !== null && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded text-sm">
          ⚠️ Bu dosya daha önce yüklendi (Batch #{duplicateBatchId}). İmport ederseniz kayıtlar çoğalabilir.
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          Aynı hedef alan birden fazla sütuna atanamaz:{' '}
          {duplicates.map((d) => FIELD_LABELS[d as TargetField]).join(', ')}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">CSV Sütunu</th>
              <th className="px-4 py-3 text-left">Örnek Değerler</th>
              <th className="px-4 py-3 text-left">Hedef Alan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {columns.map((col) => (
              <tr key={col.csv_name} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-700">{col.csv_name}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                  {col.sample_values.filter(Boolean).slice(0, 3).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={mapping[col.csv_name] ?? 'ignore'}
                    onChange={(e) => setField(col.csv_name, e.target.value as TargetField)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ALL_TARGET_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {FIELD_LABELS[f]}
                      </option>
                    ))}
                  </select>
                  {col.suggested_field && col.suggested_field !== 'ignore' && (
                    <span className="ml-2 text-xs text-green-600">✓ otomatik</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          Geri
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading || duplicates.length > 0}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'İşleniyor...' : 'İmport Et'}
        </button>
      </div>
    </div>
  )
}
