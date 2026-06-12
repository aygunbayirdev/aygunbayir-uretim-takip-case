// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

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
  sample_rows: Record<string, string>[]
  duplicate_batch_id: number | null
}

export interface ColumnMappingItem {
  csv_column: string
  target_field: TargetField
}

export type BatchStatus = 'processing' | 'completed' | 'failed'

export interface ImportBatch {
  id: number
  filename: string
  imported_at: string
  total_rows: number
  accepted_rows: number
  rejected_rows: number
  status: BatchStatus
  processed_rows: number
}

export interface BatchProgress {
  batch_id: number
  status: string
  total_rows: number
  processed_rows: number
  percentage: number
  accepted_rows: number | null
  rejected_rows: number | null
}

/** confirm endpoint'inden dönen özet — ImportBatch ile aynı shape */
export type ImportSummary = ImportBatch

// ---------------------------------------------------------------------------
// Production Record
// ---------------------------------------------------------------------------

export type ValidationStatus = 'pending' | 'clean' | 'warning' | 'rejected'

export interface ProductionRecord {
  id: number
  batch_id: number
  record_id: number
  csv_row_number: number | null
  tarih: string
  is_emri_no: string | null
  is_merkezi_no: string | null
  ismerkezi_adi: string | null
  is_istasyon_adi: string | null
  stok_adi: string | null
  vardiya: number | null
  availability: number | null
  performance: number | null
  quality: number | null
  oee: number | null
  calisma_suresi: number | null
  durus_suresi: number | null
  planli_durus: number | null
  plansiz_durus: number | null
  uretilen_miktar: number | null
  hatali_miktar: number | null
  validation_status: ValidationStatus
  is_sent: number
  updated_at: string | null
}

export interface RecordsPage {
  items: ProductionRecord[]
  total: number
  page: number
  page_size: number
}

export interface RecordFilters {
  date_from?: string
  date_to?: string
  shift?: number[]
  station?: string
  product?: string
  oee_min?: number
  oee_max?: number
  validation_status?: ValidationStatus
  issues_only?: boolean
  page?: number
  page_size?: number
}

export interface PatchRecordRequest {
  tarih?: string
  is_emri_no?: string
  is_istasyon_adi?: string
  stok_adi?: string
  vardiya?: number
  availability?: number
  performance?: number
  quality?: number
  oee?: number
  uretilen_miktar?: number
  hatali_miktar?: number
  correction_note?: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationSeverity = 'error' | 'warning'

export interface ValidationIssue {
  id: number
  record_id: number
  rule_code: string
  severity: ValidationSeverity
  field_name: string | null
  message: string | null
  suggested_action: string | null
  resolved: number
  resolved_at: string | null
  resolved_by: string | null
  correction_note: string | null
}

export interface ValidationIssuesPage {
  items: ValidationIssue[]
  total: number
  page: number
  page_size: number
}

export interface ResolveIssueRequest {
  resolved: boolean
  resolved_by?: string
  correction_note?: string
}

export interface RuleSummaryItem {
  rule_code: string
  severity: ValidationSeverity
  count: number
}

export interface ValidationSummary {
  total_issues: number
  open_issues: number
  resolved_issues: number
  error_count: number
  warning_count: number
  by_rule: RuleSummaryItem[]
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface KpiData {
  total_records: number
  clean_count: number
  warning_count: number
  rejected_count: number
  avg_oee: number | null
  avg_availability: number | null
  avg_performance: number | null
  avg_quality: number | null
  total_produced: number
  total_defective: number
  defect_rate: number | null
  date_min: string | null
  date_max: string | null
}

export interface OeeTrendItem {
  date: string
  avg_oee: number | null
  avg_availability: number | null
  avg_performance: number | null
  avg_quality: number | null
  record_count: number
}

export interface ShiftStatItem {
  shift: number
  avg_oee: number | null
  avg_availability: number | null
  avg_performance: number | null
  avg_quality: number | null
  total_produced: number
  record_count: number
}

export interface StationStatItem {
  station: string
  avg_oee: number | null
  avg_availability: number | null
  record_count: number
  total_produced: number
}

export interface QualityDistItem {
  station: string
  total_produced: number
  total_defective: number
  defect_rate: number | null
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export type SubmissionStatus = 'pending' | 'processing' | 'success' | 'failed'

export interface ApiSubmission {
  id: number
  submission_date: string
  shift: number
  records_count: number | null
  oe_value: number | null
  machine_count: number | null
  total_units: number | null
  http_status: number | null
  response_body: string | null
  submitted_at: string | null
  retry_count: number
  idempotency_key: string
  status: SubmissionStatus
}

export interface SubmissionsPage {
  items: ApiSubmission[]
  total: number
}

export interface SendSubmissionsResponse {
  submission_id: number
  status: string
}
