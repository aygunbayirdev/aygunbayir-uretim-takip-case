import axios from 'axios'
import type { ImportSummary, PreviewResult, ColumnMappingItem } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

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
}

export default api
