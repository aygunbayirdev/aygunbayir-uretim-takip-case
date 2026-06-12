import { useCallback, useEffect, useRef, useState } from 'react'
import { importApi } from '../services/api'
import type { BatchStatus, ColumnMappingItem, ImportBatch, PreviewResult } from '../types'

export type ImportStep = 'upload' | 'mapping' | 'progress' | 'summary'

export interface FileEntry {
  id: string
  file: File
  preview: PreviewResult | null
  analyzing: boolean
  isDuplicateInBatch: boolean   // aynı hash başka bir dosyada var
  batchId: number | null
  batchStatus: string | null    // 'processing' | 'completed' | 'failed'
  batchResult: ImportBatch | null
  error: string | null
  progress: number              // 0-100, satır bazlı ilerleme yüzdesi
}

export function useImport() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Polling için ref — step/entries değişince timer yeniden kurulur
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  // Progress adımında tamamlanmamış batch'leri poll et
  useEffect(() => {
    if (step !== 'progress') { stopPolling(); return }

    pollingRef.current = setInterval(async () => {
      setEntries((prev) => {
        const processing = prev.filter(
          (e) => e.batchId !== null && e.batchStatus === 'processing',
        )
        if (processing.length === 0) return prev
        // Progress endpoint'ini poll et — satır bazlı yüzde + durum
        processing.forEach(async (entry) => {
          if (!entry.batchId) return
          try {
            const prog = await importApi.getBatchProgress(entry.batchId)
            setEntries((cur) =>
              cur.map((e) => {
                if (e.id !== entry.id) return e
                const isDone = prog.status === 'completed' || prog.status === 'failed'
                return {
                  ...e,
                  progress: prog.percentage,
                  batchStatus: prog.status,
                  batchResult: isDone
                    ? {
                        id: prog.batch_id,
                        filename: e.file.name,
                        imported_at: '',
                        total_rows: prog.total_rows,
                        accepted_rows: prog.accepted_rows ?? 0,
                        rejected_rows: prog.rejected_rows ?? 0,
                        status: prog.status as BatchStatus,
                        processed_rows: prog.processed_rows,
                      }
                    : e.batchResult,
                }
              }),
            )
          } catch { /* network hataları sessizce geç */ }
        })
        return prev
      })
    }, 300)

    return stopPolling
  }, [step])

  // Tüm işlemler bitince summary'e geç
  useEffect(() => {
    if (step !== 'progress' || entries.length === 0) return

    const actionable = entries.filter(
      (e) => !e.isDuplicateInBatch && e.preview?.duplicate_batch_id === null,
    )
    const allDone = actionable.every(
      (e) =>
        e.batchStatus === 'completed' ||
        e.batchStatus === 'failed' ||
        e.error !== null,
    )
    if (allDone && actionable.length > 0) {
      stopPolling()
      setStep('summary')
    }
  }, [step, entries])

  const addFiles = useCallback(async (files: File[]) => {
    setGlobalError(null)
    const newEntries: FileEntry[] = files.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      preview: null,
      analyzing: true,
      isDuplicateInBatch: false,
      batchId: null,
      batchStatus: null,
      batchResult: null,
      error: null,
      progress: 0,
    }))
    setEntries(newEntries)
    setStep('mapping')

    const result = [...newEntries]
    const seenHashes = new Set<string>()

    for (let i = 0; i < result.length; i++) {
      try {
        const preview = await importApi.preview(result[i].file)
        const isDuplicateInBatch = seenHashes.has(preview.file_hash)
        if (!isDuplicateInBatch) seenHashes.add(preview.file_hash)
        result[i] = { ...result[i], preview, analyzing: false, isDuplicateInBatch }
      } catch {
        result[i] = { ...result[i], analyzing: false, error: 'Analiz edilemedi.' }
      }
      setEntries([...result])
    }
  }, [])

  const confirmImport = useCallback(async (mapping: ColumnMappingItem[]) => {
    setStep('progress')

    const toImport = entries.filter(
      (e) => e.preview && !e.isDuplicateInBatch && e.preview.duplicate_batch_id === null && !e.error,
    )

    for (const entry of toImport) {
      if (!entry.preview) continue
      try {
        const batch = await importApi.confirm(entry.preview.token, mapping)
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id
              ? { ...e, batchId: batch.id, batchStatus: batch.status, batchResult: batch }
              : e,
          ),
        )
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Import başlatılamadı.'
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, error: msg } : e)),
        )
      }
    }
  }, [entries])

  const reset = useCallback(() => {
    stopPolling()
    setStep('upload')
    setEntries([])
    setGlobalError(null)
  }, [])

  // Mapping adımı için ilk geçerli dosyanın preview'ını döndür
  const firstValidPreview = entries.find(
    (e) => e.preview && !e.isDuplicateInBatch && e.preview.duplicate_batch_id === null,
  )?.preview ?? null

  return {
    step,
    entries,
    globalError,
    firstValidPreview,
    addFiles,
    confirmImport,
    reset,
  }
}
