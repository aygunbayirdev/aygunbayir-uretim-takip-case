import { useState } from 'react'
import { Download, X, CheckCircle } from 'lucide-react'
import { useValidationIssues, useValidationSummary, useResolveIssue } from '../hooks/useValidation'
import { validationApi } from '../services/api'
import SeverityBadge from '../components/shared/SeverityBadge'
import type { ValidationIssue } from '../types'

// ---------------------------------------------------------------------------
// Summary cards
// ---------------------------------------------------------------------------
function SummaryCards() {
  const { data } = useValidationSummary()
  if (!data) return null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Toplam Issue"   value={data.total_issues}    color="text-gray-900" />
      <StatCard label="Açık"           value={data.open_issues}     color="text-amber-600" />
      <StatCard label="Hata (Error)"   value={data.error_count}     color="text-red-600" />
      <StatCard label="Uyarı (Warning)" value={data.warning_count}  color="text-amber-500" />
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value.toLocaleString('tr-TR')}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Resolve modal
// ---------------------------------------------------------------------------
interface ResolveModalProps {
  issue: ValidationIssue
  onClose: () => void
}

function ResolveModal({ issue, onClose }: ResolveModalProps) {
  const [resolvedBy, setResolvedBy] = useState('')
  const [note, setNote] = useState('')
  const resolve = useResolveIssue()

  const handleSubmit = async () => {
    await resolve.mutateAsync({
      id: issue.id,
      body: { resolved: true, resolved_by: resolvedBy || undefined, correction_note: note || undefined },
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Issue Çöz — #{issue.id}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 text-sm">
          {/* Issue detayı */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs bg-white border border-gray-200 px-2 py-0.5 rounded">
                {issue.rule_code}
              </span>
              <SeverityBadge severity={issue.severity} />
            </div>
            {issue.field_name && (
              <p className="text-xs text-gray-500">Alan: <span className="font-medium text-gray-700">{issue.field_name}</span></p>
            )}
            <p className="text-gray-700">{issue.message}</p>
          </div>

          {/* Çözen kişi */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Çözen Kişi</label>
            <input
              type="text"
              placeholder="Ad Soyad..."
              value={resolvedBy}
              onChange={(e) => setResolvedBy(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Düzeltme notu */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Düzeltme / Açıklama</label>
            <textarea
              rows={3}
              placeholder="Nasıl çözüldüğünü açıklayın..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={resolve.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle size={15} />
            {resolve.isPending ? 'Kaydediliyor...' : 'Çözüldü Olarak İşaretle'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const PAGE_SIZE = 50

export default function ValidationPage() {
  const [showResolved, setShowResolved] = useState(false)
  const [filterSeverity, setFilterSeverity] = useState<'' | 'error' | 'warning'>('')
  const [filterRule, setFilterRule] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ValidationIssue | null>(null)

  const resetPage = () => setPage(1)

  const { data, isLoading } = useValidationIssues({
    resolved: showResolved ? undefined : false,
    severity: filterSeverity || undefined,
    rule_code: filterRule || undefined,
    page,
    page_size: PAGE_SIZE,
  })

  const issues = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleExport = () => window.open(validationApi.exportUrl(), '_blank')

  return (
    <div className="space-y-4">
      {/* Özet kartlar */}
      <SummaryCards />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterSeverity}
          onChange={(e) => { setFilterSeverity(e.target.value as '' | 'error' | 'warning'); resetPage() }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tüm Seviyeler</option>
          <option value="error">Hata</option>
          <option value="warning">Uyarı</option>
        </select>

        <input
          type="text"
          placeholder="Kural kodu (VG-01...)"
          value={filterRule}
          onChange={(e) => { setFilterRule(e.target.value); resetPage() }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => { setShowResolved(e.target.checked); resetPage() }}
            className="rounded"
          />
          Çözülmüşleri göster
        </label>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">{total.toLocaleString('tr-TR')} issue</span>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={15} />
            Excel İndir
          </button>
        </div>
      </div>

      {/* Issue tablosu */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kayıt</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kural</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Seviye</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Alan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mesaj</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Yükleniyor...</td></tr>
              ) : issues.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Issue bulunamadı.</td></tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{issue.id}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-blue-600">#{issue.record_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{issue.rule_code}</span>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={issue.severity} /></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{issue.field_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={issue.message ?? ''}>
                      {issue.message ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {issue.resolved ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle size={11} /> Çözüldü
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Açık</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!issue.resolved && (
                        <button
                          onClick={() => setSelected(issue)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Çöz
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-500">
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} / {total.toLocaleString('tr-TR')}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
              >
                ← Önceki
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <ResolveModal issue={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
