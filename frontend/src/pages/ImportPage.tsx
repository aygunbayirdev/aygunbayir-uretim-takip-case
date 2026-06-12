import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useImport } from '../hooks/useImport'
import ColumnMappingStep from '../components/import/ColumnMappingStep'

function UploadStep({
  onFile,
  loading,
  error,
}: {
  onFile: (file: File) => void
  loading: boolean
  error: string | null
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0])
    },
    [onFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    disabled: loading,
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">CSV Yükle</h2>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <p className="text-gray-500">
          {loading
            ? 'Dosya analiz ediliyor...'
            : isDragActive
            ? 'Dosyayı buraya bırakın'
            : 'CSV dosyasını sürükleyin veya tıklayın'}
        </p>
        <p className="text-xs text-gray-400 mt-2">Yalnızca .csv uzantılı dosyalar</p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  )
}

function SummaryStep({
  summary,
  onReset,
}: {
  summary: NonNullable<ReturnType<typeof useImport>['summary']>
  onReset: () => void
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Import Tamamlandı</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Toplam Satır', value: summary.total_rows },
          { label: 'Kabul Edilen', value: summary.accepted_rows, color: 'text-green-600' },
          { label: 'Reddedilen', value: summary.rejected_rows, color: 'text-red-600' },
          { label: 'Batch ID', value: `#${summary.batch_id}` },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 uppercase">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color ?? 'text-gray-800'}`}>{value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-600">
        <span className="font-medium">{summary.filename}</span> başarıyla import edildi.
      </p>
      <button
        onClick={onReset}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Yeni Import
      </button>
    </div>
  )
}

export default function ImportPage() {
  const { step, preview, summary, loading, error, uploadForPreview, confirmImport, reset } =
    useImport()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">CSV Import</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {step === 'upload' && (
          <UploadStep onFile={uploadForPreview} loading={loading} error={error} />
        )}

        {step === 'mapping' && preview && (
          <ColumnMappingStep
            columns={preview.columns}
            duplicateBatchId={preview.duplicate_batch_id}
            onConfirm={confirmImport}
            onBack={reset}
            loading={loading}
          />
        )}

        {step === 'summary' && summary && (
          <SummaryStep summary={summary} onReset={reset} />
        )}
      </div>
    </div>
  )
}
