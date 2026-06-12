import { useState } from 'react'
import { importApi } from '../services/api'
import type { ColumnMappingItem, ImportSummary, PreviewResult } from '../types'

type ImportStep = 'upload' | 'mapping' | 'summary'

export function useImport() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadForPreview = async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const result = await importApi.preview(file)
      setPreview(result)
      setStep('mapping')
    } catch {
      setError('Dosya önizlemesi alınamadı.')
    } finally {
      setLoading(false)
    }
  }

  const confirmImport = async (mapping: ColumnMappingItem[]) => {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const result = await importApi.confirm(preview.token, mapping)
      setSummary(result)
      setStep('summary')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import başarısız.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep('upload')
    setPreview(null)
    setSummary(null)
    setError(null)
  }

  return { step, preview, summary, loading, error, uploadForPreview, confirmImport, reset }
}
