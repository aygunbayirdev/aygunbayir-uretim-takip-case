import { useCallback, type ReactNode } from 'react'
import { useDropzone } from 'react-dropzone'
import { CheckCircle, AlertCircle, Loader2, XCircle, UploadCloud } from 'lucide-react'
import { useImport, type FileEntry } from '../hooks/useImport'
import ColumnMappingStep from '../components/import/ColumnMappingStep'
import type { ColumnMappingItem } from '../types'

// ---------------------------------------------------------------------------
// Step 1 — Dropzone
// ---------------------------------------------------------------------------
function UploadStep({ onFiles, loading }: { onFiles: (f: File[]) => void; loading: boolean }) {
  const onDrop = useCallback((accepted: File[]) => { if (accepted.length) onFiles(accepted) }, [onFiles])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: true,
    disabled: loading,
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">CSV Yükle</h2>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <UploadCloud size={36} className="mx-auto mb-3 text-gray-400" />
        <p className="text-gray-600 font-medium">
          {isDragActive ? 'Dosyaları buraya bırakın' : 'CSV dosyalarını sürükleyin veya tıklayın'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Birden fazla .csv dosyası seçilebilir</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Mapping (file list + preview + column mapping)
// ---------------------------------------------------------------------------
function FileStatusRow({ entry }: { entry: FileEntry }) {
  const sizeKb = (entry.file.size / 1024).toFixed(1)

  let icon: ReactNode
  let statusText: string
  let textColor: string

  if (entry.analyzing) {
    icon = <Loader2 size={15} className="animate-spin text-blue-500" />
    statusText = 'Analiz ediliyor...'
    textColor = 'text-blue-600'
  } else if (entry.error) {
    icon = <XCircle size={15} className="text-red-500" />
    statusText = entry.error
    textColor = 'text-red-600'
  } else if (entry.isDuplicateInBatch) {
    icon = <AlertCircle size={15} className="text-amber-500" />
    statusText = 'Bu batch içinde aynı dosya var — atlanacak'
    textColor = 'text-amber-600'
  } else if (entry.preview?.duplicate_batch_id !== null) {
    icon = <AlertCircle size={15} className="text-amber-500" />
    statusText = `Daha önce yüklendi (Batch #${entry.preview?.duplicate_batch_id}) — atlanacak`
    textColor = 'text-amber-600'
  } else {
    icon = <CheckCircle size={15} className="text-green-500" />
    statusText = 'Hazır'
    textColor = 'text-green-600'
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50 border border-gray-200">
      {icon}
      <span className="flex-1 text-sm text-gray-800 truncate">{entry.file.name}</span>
      <span className="text-xs text-gray-400">{sizeKb} KB</span>
      <span className={`text-xs font-medium ${textColor}`}>{statusText}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Progress
// ---------------------------------------------------------------------------
function ProgressStep({ entries }: { entries: FileEntry[] }) {
  const actionable = entries.filter((e) => !e.isDuplicateInBatch && e.preview?.duplicate_batch_id === null)

  const totalPct = actionable.length > 0
    ? Math.round(actionable.reduce((sum, e) => sum + e.progress, 0) / actionable.length)
    : 0
  const doneCount = actionable.filter(
    (e) => e.batchStatus === 'completed' || e.batchStatus === 'failed' || e.error,
  ).length

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">İçe Aktarılıyor</h2>

      {/* Genel ilerleme */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{doneCount} / {actionable.length} dosya tamamlandı</span>
          <span className="font-medium text-gray-700">{totalPct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${totalPct}%` }}
          />
        </div>
      </div>

      {/* Dosya bazlı ilerleme */}
      <div className="space-y-3">
        {actionable.map((entry) => {
          let icon: ReactNode
          let statusText: string
          let barColor: string

          if (entry.error) {
            icon = <XCircle size={15} className="text-red-500 shrink-0" />
            statusText = entry.error
            barColor = 'bg-red-400'
          } else if (entry.batchStatus === 'completed') {
            icon = <CheckCircle size={15} className="text-green-500 shrink-0" />
            statusText = `${entry.batchResult?.accepted_rows ?? 0} kabul · ${entry.batchResult?.rejected_rows ?? 0} reddedildi`
            barColor = 'bg-green-500'
          } else if (entry.batchStatus === 'failed') {
            icon = <XCircle size={15} className="text-red-500 shrink-0" />
            statusText = 'Import başarısız'
            barColor = 'bg-red-400'
          } else {
            icon = <Loader2 size={15} className="animate-spin text-blue-500 shrink-0" />
            statusText = entry.batchId
              ? `${entry.progress}% — ${entry.batchResult?.total_rows ?? '...'} satır işleniyor`
              : 'Başlatılıyor...'
            barColor = 'bg-blue-500'
          }

          return (
            <div key={entry.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                {icon}
                <span className="flex-1 text-sm text-gray-800 truncate">{entry.file.name}</span>
                <span className="text-xs text-gray-500 shrink-0">{statusText}</span>
              </div>
              {entry.batchId !== null && (
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`${barColor} h-1.5 rounded-full transition-all duration-300 ease-out`}
                    style={{ width: `${entry.progress}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Summary
// ---------------------------------------------------------------------------
function SummaryStep({ entries, onReset }: { entries: FileEntry[]; onReset: () => void }) {
  const completed = entries.filter((e) => e.batchStatus === 'completed')
  const failed = entries.filter((e) => e.batchStatus === 'failed' || e.error)
  const skipped = entries.filter((e) => e.isDuplicateInBatch || (e.preview?.duplicate_batch_id !== null && !e.batchId))

  const totalAccepted = completed.reduce((sum, e) => sum + (e.batchResult?.accepted_rows ?? 0), 0)
  const totalRejected = completed.reduce((sum, e) => sum + (e.batchResult?.rejected_rows ?? 0), 0)
  const totalRows = completed.reduce((sum, e) => sum + (e.batchResult?.total_rows ?? 0), 0)

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Import Tamamlandı</h2>

      {/* Genel istatistikler */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Toplam Satır', value: totalRows, color: 'text-gray-800' },
          { label: 'Kabul Edilen', value: totalAccepted, color: 'text-green-600' },
          { label: 'Reddedilen', value: totalRejected, color: 'text-red-600' },
          { label: 'Başarılı Dosya', value: completed.length, color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 uppercase">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Dosya bazlı detay */}
      <div className="space-y-2">
        {completed.map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm">
            <CheckCircle size={14} className="text-green-600 shrink-0" />
            <span className="flex-1 truncate font-medium text-gray-800">{e.file.name}</span>
            <span className="text-green-700 text-xs">Batch #{e.batchId}</span>
          </div>
        ))}
        {skipped.map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <AlertCircle size={14} className="text-amber-600 shrink-0" />
            <span className="flex-1 truncate text-gray-700">{e.file.name}</span>
            <span className="text-amber-600 text-xs">Atlandı (duplicate)</span>
          </div>
        ))}
        {failed.map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm">
            <XCircle size={14} className="text-red-600 shrink-0" />
            <span className="flex-1 truncate text-gray-700">{e.file.name}</span>
            <span className="text-red-600 text-xs">Başarısız</span>
          </div>
        ))}
      </div>

      <button
        onClick={onReset}
        className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Yeni Import
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ImportPage() {
  const { step, entries, globalError, firstValidPreview, addFiles, confirmImport, reset } = useImport()

  const allAnalyzed = entries.length > 0 && entries.every((e) => !e.analyzing)
  const hasValid = entries.some(
    (e) => e.preview && !e.isDuplicateInBatch && e.preview.duplicate_batch_id === null && !e.error,
  )

  const handleConfirm = (mapping: ColumnMappingItem[]) => {
    confirmImport(mapping)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {/* Upload */}
        {step === 'upload' && (
          <UploadStep onFiles={addFiles} loading={false} />
        )}

        {/* Mapping */}
        {step === 'mapping' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Dosya Analizi & Sütun Eşleştirme</h2>
              <p className="text-sm text-gray-500 mt-1">
                {allAnalyzed
                  ? `${entries.length} dosya analiz edildi.`
                  : `${entries.filter((e) => !e.analyzing).length} / ${entries.length} dosya analiz edildi...`}
              </p>
            </div>

            {/* Dosya listesi */}
            <div className="space-y-2">
              {entries.map((e) => <FileStatusRow key={e.id} entry={e} />)}
            </div>

            {/* Sütun eşleştirme — sadece geçerli dosya varsa göster */}
            {allAnalyzed && firstValidPreview && (
              <ColumnMappingStep
                columns={firstValidPreview.columns}
                sampleRows={firstValidPreview.sample_rows}
                duplicateBatchId={null}
                onConfirm={handleConfirm}
                onBack={reset}
                loading={false}
              />
            )}

            {/* Geçerli dosya yoksa uyarı */}
            {allAnalyzed && !hasValid && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                Tüm dosyalar daha önce yüklendi veya hatalı. Yeni dosya seçmek için geri dönün.
              </div>
            )}

            {allAnalyzed && !hasValid && (
              <button onClick={reset} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Geri
              </button>
            )}
          </div>
        )}

        {/* Progress */}
        {step === 'progress' && <ProgressStep entries={entries} />}

        {/* Summary */}
        {step === 'summary' && <SummaryStep entries={entries} onReset={reset} />}

        {/* Global error */}
        {globalError && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {globalError}
          </div>
        )}
      </div>
    </div>
  )
}
