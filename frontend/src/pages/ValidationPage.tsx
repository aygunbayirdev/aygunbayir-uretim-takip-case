import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, X, CheckCircle, Wrench } from 'lucide-react'
import { useValidationIssues, useValidationSummary, useResolveIssue } from '../hooks/useValidation'
import { usePatchRecord } from '../hooks/useRecords'
import { validationApi, recordsApi } from '../services/api'
import SeverityBadge from '../components/shared/SeverityBadge'
import type { ValidationIssue, PatchRecordRequest } from '../types'

// ---------------------------------------------------------------------------
// Field config — alan adı → input tipi + Türkçe etiket
// ---------------------------------------------------------------------------
type FieldInputType = 'text' | 'float' | 'int' | 'date' | 'vardiya'

const FIELD_CONFIG: Record<string, { type: FieldInputType; label: string }> = {
  tarih:           { type: 'date',    label: 'Tarih' },
  is_emri_no:      { type: 'text',    label: 'İş Emri No' },
  is_merkezi_no:   { type: 'text',    label: 'İş Merkezi No' },
  ismerkezi_adi:   { type: 'text',    label: 'İşmerkezi Adı' },
  is_istasyon_adi: { type: 'text',    label: 'İstasyon Adı' },
  stok_adi:        { type: 'text',    label: 'Stok Adı' },
  vardiya:         { type: 'vardiya', label: 'Vardiya' },
  availability:    { type: 'float',   label: 'Kullanılırlık (A%)' },
  performance:     { type: 'float',   label: 'Performans (P%)' },
  quality:         { type: 'float',   label: 'Kalite (Q%)' },
  oee:             { type: 'float',   label: 'OEE' },
  calisma_suresi:  { type: 'float',   label: 'Çalışma Süresi (dk)' },
  durus_suresi:    { type: 'float',   label: 'Duruş Süresi (dk)' },
  planli_durus:    { type: 'float',   label: 'Planlı Duruş (dk)' },
  plansiz_durus:   { type: 'float',   label: 'Plansız Duruş (dk)' },
  uretilen_miktar: { type: 'int',     label: 'Üretilen Miktar' },
  hatali_miktar:   { type: 'int',     label: 'Hatalı Miktar' },
}

function parseFieldNames(fieldName: string | null): string[] {
  if (!fieldName) return []
  return fieldName.split(',').map((f) => f.trim()).filter((f) => f in FIELD_CONFIG)
}

function toTyped(field: string, raw: string): unknown {
  const type = FIELD_CONFIG[field]?.type
  if (type === 'int') return parseInt(raw, 10)
  if (type === 'float') return parseFloat(raw)
  return raw
}

// ---------------------------------------------------------------------------
// Summary cards
// ---------------------------------------------------------------------------
function SummaryCards() {
  const { data } = useValidationSummary()
  if (!data) return null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard label="Toplam Issue"    value={data.total_issues}     color="text-gray-900" />
      <StatCard label="Açık"            value={data.open_issues}      color="text-amber-600" />
      <StatCard label="Çözüldü"         value={data.resolved_issues}  color="text-green-600" />
      <StatCard label="Hata (Error)"    value={data.error_count}      color="text-red-600" />
      <StatCard label="Uyarı (Warning)" value={data.warning_count}    color="text-amber-500" />
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
  const isError = issue.severity === 'error'
  const editableFields = parseFieldNames(issue.field_name)

  const [resolvedBy, setResolvedBy] = useState('')
  const [note, setNote] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  const resolve = useResolveIssue()
  const patch = usePatchRecord()
  const queryClient = useQueryClient()

  // Hata tipinde etkilenen kaydı çek
  const { data: record, isLoading: recordLoading } = useQuery({
    queryKey: ['record', issue.record_id],
    queryFn: () => recordsApi.getById(issue.record_id),
    enabled: isError,
  })

  // Kayıt yüklenince mevcut değerleri inputlara doldur
  useEffect(() => {
    if (!record || editableFields.length === 0) return
    const initial: Record<string, string> = {}
    editableFields.forEach((f) => {
      const val = record[f as keyof typeof record]
      initial[f] = val !== null && val !== undefined ? String(val) : ''
    })
    setFieldValues(initial)
  }, [record]) // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (field: string, val: string) =>
    setFieldValues((prev) => ({ ...prev, [field]: val }))

  // WARNING → sadece issue'yu resolve et
  const handleWarningSubmit = async () => {
    await resolve.mutateAsync({
      id: issue.id,
      body: { resolved: true, resolved_by: resolvedBy || undefined, correction_note: note || undefined },
    })
    onClose()
  }

  // ERROR → önce kaydı düzelt, sonra issue'yu resolve et
  const handleErrorSubmit = async () => {
    const patchBody: PatchRecordRequest = { correction_note: note || undefined }
    editableFields.forEach((f) => {
      const raw = fieldValues[f]
      if (raw !== undefined && raw !== '') {
        (patchBody as Record<string, unknown>)[f] = toTyped(f, raw)
      }
    })

    await patch.mutateAsync({ id: issue.record_id, body: patchBody })
    await resolve.mutateAsync({
      id: issue.id,
      body: { resolved: true, resolved_by: resolvedBy || undefined, correction_note: note || undefined },
    })
    queryClient.invalidateQueries({ queryKey: ['validation'] })
    onClose()
  }

  const isPending = resolve.isPending || patch.isPending

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">
              {isError ? 'Veriyi Düzelt' : 'Issue Onayla'} — #{issue.id}
            </h2>
            <SeverityBadge severity={issue.severity} />
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 text-sm overflow-y-auto">
          {/* Issue detayı */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
            <span className="font-mono text-xs bg-white border border-gray-200 px-2 py-0.5 rounded">
              {issue.rule_code}
            </span>
            {issue.field_name && (
              <p className="text-xs text-gray-500">
                Alan: <span className="font-medium text-gray-700">{issue.field_name}</span>
              </p>
            )}
            <p className="text-gray-700 text-xs leading-relaxed">{issue.message}</p>
          </div>

          {/* ERROR: editable field inputları */}
          {isError && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Wrench size={11} /> Değerleri Düzelt
              </p>
              {recordLoading ? (
                <div className="text-xs text-gray-400 py-2">Kayıt yükleniyor...</div>
              ) : editableFields.length === 0 ? (
                <div className="text-xs text-gray-400 py-2">
                  Bu kural için düzenlenecek alan bilgisi bulunamadı.
                </div>
              ) : (
                editableFields.map((field) => {
                  const cfg = FIELD_CONFIG[field]
                  return (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {cfg.label}
                      </label>
                      {cfg.type === 'vardiya' ? (
                        <select
                          value={fieldValues[field] ?? ''}
                          onChange={(e) => setField(field, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Seçin</option>
                          <option value="1">1. Vardiya</option>
                          <option value="2">2. Vardiya</option>
                          <option value="3">3. Vardiya</option>
                        </select>
                      ) : (
                        <input
                          type={cfg.type === 'date' ? 'date' : 'number'}
                          step={cfg.type === 'float' ? '0.01' : '1'}
                          min={cfg.type === 'date' ? undefined : '0'}
                          value={fieldValues[field] ?? ''}
                          onChange={(e) => setField(field, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

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
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {isError ? 'Düzeltme Notu' : 'Açıklama / Onay Notu'}
            </label>
            <textarea
              rows={3}
              placeholder={isError ? 'Değeri neden düzelttinizi açıklayın...' : 'Nasıl çözüldüğünü açıklayın...'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={isError ? handleErrorSubmit : handleWarningSubmit}
            disabled={isPending || (isError && recordLoading)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${
              isError
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isError ? <Wrench size={15} /> : <CheckCircle size={15} />}
            {isPending
              ? 'Kaydediliyor...'
              : isError
              ? 'Düzelt ve Çöz'
              : 'Onayla'}
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
  const [resolvedFilter, setResolvedFilter] = useState<'open' | 'resolved' | 'all'>('open')
  const [filterSeverity, setFilterSeverity] = useState<'' | 'error' | 'warning'>('')
  const [filterRule, setFilterRule] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ValidationIssue | null>(null)

  const resetPage = () => setPage(1)

  const resolvedParam =
    resolvedFilter === 'open' ? false : resolvedFilter === 'resolved' ? true : undefined

  const { data, isLoading } = useValidationIssues({
    resolved: resolvedParam,
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

        <select
          value={resolvedFilter}
          onChange={(e) => { setResolvedFilter(e.target.value as 'open' | 'resolved' | 'all'); resetPage() }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="open">Açık</option>
          <option value="resolved">Çözüldü</option>
          <option value="all">Tümü</option>
        </select>

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
                          className={`text-xs font-medium hover:underline ${
                            issue.severity === 'error'
                              ? 'text-blue-600 hover:text-blue-800'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {issue.severity === 'error' ? 'Düzelt' : 'Onayla'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
              <span className="px-3 py-1.5 text-xs text-gray-600">{page} / {totalPages}</span>
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
