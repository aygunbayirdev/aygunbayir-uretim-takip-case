import axios from 'axios'
import type {
  BatchProgress,
  ColumnMappingItem,
  ImportBatch,
  ImportSummary,
  KpiData,
  OeeTrendItem,
  PatchRecordRequest,
  PreviewResult,
  ProductionRecord,
  QualityDistItem,
  RecordFilters,
  RecordsPage,
  ResolveIssueRequest,
  SendSubmissionsResponse,
  ShiftStatItem,
  StationStatItem,
  ApiSubmission,
  SubmissionsPage,
  ValidationIssue,
  ValidationIssuesPage,
  ValidationSummary,
} from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export const importApi = {
  preview: async (file: File): Promise<PreviewResult> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<PreviewResult>('/import/preview', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  confirm: async (token: string, mapping: ColumnMappingItem[]): Promise<ImportSummary> => {
    const { data } = await api.post<ImportSummary>('/import/confirm', { token, mapping })
    return data
  },

  getBatches: async (): Promise<ImportBatch[]> => {
    const { data } = await api.get<ImportBatch[]>('/import/batches')
    return data
  },

  getBatch: async (id: number): Promise<ImportBatch> => {
    const { data } = await api.get<ImportBatch>(`/import/batches/${id}`)
    return data
  },

  getBatchProgress: async (id: number): Promise<BatchProgress> => {
    const { data } = await api.get<BatchProgress>(`/import/batches/${id}/progress`)
    return data
  },
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export const recordsApi = {
  list: async (filters: RecordFilters = {}): Promise<RecordsPage> => {
    const { data } = await api.get<RecordsPage>('/records', { params: filters })
    return data
  },

  getById: async (id: number): Promise<ProductionRecord> => {
    const { data } = await api.get<ProductionRecord>(`/records/${id}`)
    return data
  },

  patch: async (id: number, body: PatchRecordRequest): Promise<ProductionRecord> => {
    const { data } = await api.patch<ProductionRecord>(`/records/${id}`, body)
    return data
  },

  exportUrl: (filters: RecordFilters = {}): string => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v))
    })
    const qs = params.toString()
    return `/api/records/export${qs ? `?${qs}` : ''}`
  },
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const validationApi = {
  listIssues: async (params: {
    record_id?: number
    resolved?: boolean
    severity?: string
    rule_code?: string
    page?: number
    page_size?: number
  } = {}): Promise<ValidationIssuesPage> => {
    const { data } = await api.get<ValidationIssuesPage>('/validation/issues', { params })
    return data
  },

  getIssue: async (id: number): Promise<ValidationIssue> => {
    const { data } = await api.get<ValidationIssue>(`/validation/issues/${id}`)
    return data
  },

  resolveIssue: async (id: number, body: ResolveIssueRequest): Promise<ValidationIssue> => {
    const { data } = await api.patch<ValidationIssue>(`/validation/issues/${id}`, body)
    return data
  },

  getSummary: async (): Promise<ValidationSummary> => {
    const { data } = await api.get<ValidationSummary>('/validation/summary')
    return data
  },

  exportUrl: (): string => '/api/validation/export',
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const dashboardApi = {
  getKpi: async (): Promise<KpiData> => {
    const { data } = await api.get<KpiData>('/dashboard/kpi')
    return data
  },

  getOeeTrend: async (dateFrom?: string, dateTo?: string): Promise<OeeTrendItem[]> => {
    const { data } = await api.get<OeeTrendItem[]>('/dashboard/oee-trend', {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    return data
  },

  getByShift: async (): Promise<ShiftStatItem[]> => {
    const { data } = await api.get<ShiftStatItem[]>('/dashboard/by-shift')
    return data
  },

  getByStation: async (): Promise<StationStatItem[]> => {
    const { data } = await api.get<StationStatItem[]>('/dashboard/by-station')
    return data
  },

  getQualityDist: async (): Promise<QualityDistItem[]> => {
    const { data } = await api.get<QualityDistItem[]>('/dashboard/quality-dist')
    return data
  },
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export const submissionsApi = {
  list: async (): Promise<SubmissionsPage> => {
    const { data } = await api.get<SubmissionsPage>('/submissions')
    return data
  },

  getById: async (id: number): Promise<ApiSubmission> => {
    const { data } = await api.get<ApiSubmission>(`/submissions/${id}`)
    return data
  },

  send: async (): Promise<SendSubmissionsResponse> => {
    const { data } = await api.post<SendSubmissionsResponse>('/submissions/send')
    return data
  },

  retry: async (id: number): Promise<SendSubmissionsResponse> => {
    const { data } = await api.post<SendSubmissionsResponse>(`/submissions/${id}/retry`)
    return data
  },
}

export default api
