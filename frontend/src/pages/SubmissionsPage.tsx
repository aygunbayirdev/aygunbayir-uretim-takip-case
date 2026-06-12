import { useState } from 'react'
import { Send, RefreshCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { useSubmissions, useSendSubmissions, useRetrySubmission } from '../hooks/useSubmissions'
import StatusBadge from '../components/shared/StatusBadge'
import type { ApiSubmission } from '../types'

function parseResultMessage(sub: ApiSubmission): { type: 'success' | 'warning' | 'error'; text: string } {
  const body = sub.response_body ?? ''
  if (sub.status === 'failed') {
    return { type: 'error', text: `Gönderim başarısız: ${body}` }
  }
  if (body === 'Gönderilecek kayıt yok.' || body.startsWith('0 grup')) {
    return { type: 'warning', text: 'Gönderilecek temiz kayıt bulunamadı.' }
  }
  const match = body.match(/^(\d+) grup gönderildi/)
  if (match) {
    const count = parseInt(match[1], 10)
    const suffix = body.includes('Hata:') ? ` (bazı gruplar başarısız oldu)` : ''
    return { type: count > 0 ? 'success' : 'warning', text: `${count} gün+vardiya grubu API'ye gönderildi${suffix}.` }
  }
  return { type: 'success', text: body || 'Gönderim tamamlandı.' }
}

export default function SubmissionsPage() {
  const [isPolling, setIsPolling] = useState(false)
  const [lastSubmissionId, setLastSubmissionId] = useState<number | null>(null)
  const { data, isLoading } = useSubmissions(isPolling)
  const send = useSendSubmissions()
  const retry = useRetrySubmission()
  const [expanded, setExpanded] = useState<number | null>(null)

  const items = data?.items ?? []
  const hasProcessing = items.some((s) => s.status === 'processing' || s.status === 'pending')

  const lastSub = lastSubmissionId != null ? items.find((s) => s.id === lastSubmissionId) : null
  const showResult = !isPolling && !hasProcessing && lastSub != null && lastSub.status !== 'processing'
  const resultMsg = lastSub ? parseResultMessage(lastSub) : null

  const handleSend = () => {
    send.mutate(undefined, {
      onSuccess: (res) => {
        setLastSubmissionId(res.submission_id)
        setIsPolling(true)
        setTimeout(() => setIsPolling(false), 10000)
      },
    })
  }

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
          onClick={handleSend}
          disabled={send.isPending || hasProcessing || isPolling}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={15} />
          {send.isPending ? 'Gönderiliyor...' : 'Temiz Kayıtları Gönder'}
        </button>
      </div>

      {/* Processing / polling notice */}
      {(hasProcessing || isPolling) && !send.isError && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
          <RefreshCw size={15} className="animate-spin shrink-0" />
          Gönderim arka planda işleniyor, tablo güncelleniyor...
        </div>
      )}

      {/* Contextual result banner */}
      {showResult && resultMsg && resultMsg.type === 'success' && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          <CheckCircle size={15} className="shrink-0" />
          {resultMsg.text}
        </div>
      )}
      {showResult && resultMsg && resultMsg.type === 'warning' && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          <Info size={15} className="shrink-0" />
          {resultMsg.text}
        </div>
      )}
      {showResult && resultMsg && resultMsg.type === 'error' && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0" />
          {resultMsg.text}
        </div>
      )}

      {/* Send POST error */}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Gönderim Tarihi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Gönderilen Kayıt</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Yanıt Özeti</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Gönderim Zamanı</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Retry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    Yükleniyor...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
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
  const body = item.response_body ?? ''
  const summary = body.length > 60 ? body.slice(0, 60) + '…' : body

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
        <td className="px-4 py-3">
          <StatusBadge status={item.status} />
        </td>
        <td className="px-4 py-3 text-gray-700 text-center">
          {item.records_count != null ? item.records_count.toLocaleString('tr-TR') : '—'}
        </td>
        <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate" title={body}>
          {summary || '—'}
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
          <td colSpan={9} className="px-6 py-3">
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
