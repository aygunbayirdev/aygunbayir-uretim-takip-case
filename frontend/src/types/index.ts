export type TargetField =
  | 'record_id' | 'tarih' | 'is_emri_no' | 'is_merkezi_no' | 'ismerkezi_adi'
  | 'is_istasyon_adi' | 'stok_adi' | 'vardiya' | 'availability' | 'performance'
  | 'quality' | 'oee' | 'calisma_suresi' | 'durus_suresi' | 'planli_durus'
  | 'plansiz_durus' | 'uretilen_miktar' | 'hatali_miktar' | 'ignore'

export const FIELD_LABELS: Record<TargetField, string> = {
  record_id: 'Kayıt ID',
  tarih: 'Tarih',
  is_emri_no: 'İş Emri No',
  is_merkezi_no: 'İş Merkezi No',
  ismerkezi_adi: 'İşmerkezi Adı',
  is_istasyon_adi: 'İş İstasyon Adı',
  stok_adi: 'Stok Adı',
  vardiya: 'Vardiya',
  availability: 'Kullanılırlık (A%)',
  performance: 'Performans (P%)',
  quality: 'Kalite (Q%)',
  oee: 'OEE',
  calisma_suresi: 'Çalışma Süresi',
  durus_suresi: 'Duruş Süresi',
  planli_durus: 'Planlı Duruş',
  plansiz_durus: 'Plansız Duruş',
  uretilen_miktar: 'Üretilen Miktar',
  hatali_miktar: 'Hatalı Miktar',
  ignore: 'Yoksay',
}

export interface ColumnInfo {
  csv_name: string
  suggested_field: TargetField | null
  sample_values: string[]
}

export interface PreviewResult {
  token: string
  encoding: string
  file_hash: string
  columns: ColumnInfo[]
  duplicate_batch_id: number | null
}

export interface ColumnMappingItem {
  csv_column: string
  target_field: TargetField
}

export interface ImportSummary {
  batch_id: number
  filename: string
  total_rows: number
  accepted_rows: number
  rejected_rows: number
  status: string
}

export type ValidationStatus = 'pending' | 'clean' | 'warning' | 'rejected'
export type ValidationSeverity = 'error' | 'warning'
export type ValidationAction = 'reject' | 'warn' | 'autocorrect'
export type BatchStatus = 'processing' | 'completed' | 'failed'
export type SubmissionStatus = 'processing' | 'success' | 'failed'

export interface ImportBatch {
  id: number
  filename: string
  imported_at: string
  total_rows: number
  accepted_rows: number
  rejected_rows: number
  status: BatchStatus
  file_hash: string
}

export interface ProductionRecord {
  id: number
  batch_id: number
  record_id: number
  csv_row_number: number
  tarih: string
  is_emri_no: string
  is_merkezi_no: string | null
  ismerkezi_adi: string | null
  is_istasyon_adi: string
  stok_adi: string | null
  vardiya: number
  availability: number
  performance: number
  quality: number
  oee: number
  calisma_suresi: number
  durus_suresi: number
  planli_durus: number
  plansiz_durus: number
  uretilen_miktar: number
  hatali_miktar: number
  validation_status: ValidationStatus
  is_sent: boolean
  created_at: string
  updated_at: string
}

export interface ValidationIssue {
  id: number
  record_id: number
  rule_code: string
  severity: ValidationSeverity
  field_name: string | null
  message: string
  suggested_action: ValidationAction
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  correction_note: string | null
}

export interface ApiSubmission {
  id: number
  submission_date: string
  shift: number
  records_count: number
  oe_value: number
  machine_count: number
  total_units: number
  http_status: number | null
  response_body: string | null
  submitted_at: string | null
  retry_count: number
  idempotency_key: string
  status: SubmissionStatus
}

export interface KpiData {
  total_records: number
  clean_records: number
  warning_records: number
  rejected_records: number
  avg_oee: number
  avg_availability: number
  avg_performance: number
  avg_quality: number
  total_production: number
  total_defects: number
}

export interface RecordFilters {
  date_from?: string
  date_to?: string
  shift?: number
  station?: string
  product?: string
  oee_min?: number
  oee_max?: number
  issues_only?: boolean
}
