import { useState } from 'react'
import { Send, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { useSubmissions, useSendSubmissions, useRetrySubmission } from '../hooks/useSubmissions'
import StatusBadge from '../components/shared/StatusBadge'
import type { ApiSubmission } from '../types'

export default function SubmissionsPage() {
  const { data, isLoading } = useSubmissions()
  const send = useSendSubmissions()
  const retry = useRetrySubmission()
  const [expanded, setExpanded] = useState<number | null>(null)

  const items = data?.items ?? []
  const hasProcessing = items.some((s) => s.status === 'processing' || s.status === 'pending')

  const toggleExpand = (id: number) => {
    setExpanded((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Validation durumu{' '}
          <span className="font-medium text-green-700">clean</span> olan kayıtlar
          gün + vardiya bazında aggregate edilerek API'ye gönderilir.
        </p>
        <button
          onClick={() => send.mutate()}
          disabled={send.isPending || hasProcessing}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={15} />
          {send.isPending ? 'Gönderiliyor...' : 'Temiz Kayıtları Gönder'}
        </button>
      </div>

      {/* Processing notice */}
      {hasProcessing && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
          <RefreshCw size={15} className="animate-spin shrink-0" />
          Gönderim arka planda devam ediyor, durum otomatik güncelleniyor...
        </div>
      )}

      {/* Send error */}
      {send.isError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0" />
          Gönderim başlatılamadı: {(send.error as Error).message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 w-10" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tarih</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vardiya</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">OEE</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Makine</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Üretim</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">HTTP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Gönderim Zamanı</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Retry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-gray-400">
                    Yükleniyor...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-gray-400">
                    Henüz gönderim yapılmamış.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <SubmissionRow
                    key={item.id}
                    item={item}
                    expanded={expanded === item.id}
                    onToggle={() => toggleExpand(item.id)}
                    onRetry={() => retry.mutate(item.id)}
                    retrying={retry.isPending}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface RowProps {
  item: ApiSubmission
  expanded: boolean
  onToggle: () => void
  onRetry: () => void
  retrying: boolean
}

function SubmissionRow({ item, expanded, onToggle, onRetry, retrying }: RowProps) {
  return (
    <>
      <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
        <td className="px-4 py-3">
          {item.response_body && (
            <button
              onClick={onToggle}
              className="p-1 rounded hover:bg-gray-200 text-gray-400 transition-colors"
              title="Yanıt detayı"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </td>
        <td className="px-4 py-3 text-gray-500 text-xs">{item.id}</td>
        <td className="px-4 py-3 font-medium text-gray-800">{item.submission_date}</td>
        <td className="px-4 py-3 text-gray-700">{item.shift}. Vardiya</td>
        <td className="px-4 py-3 text-gray-700">
          {item.oe_value != null ? `${item.oe_value.toFixed(2)}%` : '—'}
        </td>
        <td className="px-4 py-3 text-gray-700">{item.machine_count ?? '—'}</td>
        <td className="px-4 py-3 text-gray-700">
          {item.total_units != null ? item.total_units.toLocaleString('tr-TR') : '—'}
        </td>
        <td className="px-4 py-3">
          {item.http_status != null ? (
            <span
              className={`font-mono text-xs font-medium ${
                item.http_status === 200 ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {item.http_status}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={item.status} />
        </td>
        <td className="px-4 py-3 text-gray-500 text-xs">
          {item.submitted_at ? formatDateTime(item.submitted_at) : '—'}
        </td>
        <td className="px-4 py-3 text-gray-500 text-xs text-center">{item.retry_count}</td>
        <td className="px-4 py-3">
          {item.status === 'failed' && (
            <button
              onClick={onRetry}
              disabled={retrying}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 hover:underline"
            >
              <RefreshCw size={12} />
              Tekrar Dene
            </button>
          )}
        </td>
      </tr>

      {expanded && item.response_body && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={12} className="px-6 py-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">API Yanıtı</p>
            <pre className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
              {formatJson(item.response_body)}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}
