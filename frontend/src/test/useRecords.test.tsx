import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { server } from './server'
import { useRecords } from '../hooks/useRecords'
import type { RecordsPage } from '../types'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const mockPage: RecordsPage = {
  items: [
    {
      id: 1, batch_id: 1, record_id: 100, csv_row_number: 2,
      tarih: '2025-11-05', is_emri_no: '3025678325',
      is_merkezi_no: null, ismerkezi_adi: null,
      is_istasyon_adi: 'IMM-2700-3', stok_adi: 'PART-A',
      vardiya: 1, availability: 85.0, performance: 92.0,
      quality: 98.0, oee: 76.7, calisma_suresi: 420.0,
      durus_suresi: 60.0, planli_durus: 30.0, plansiz_durus: 30.0,
      uretilen_miktar: 500, hatali_miktar: 10,
      validation_status: 'clean', is_sent: 0, updated_at: null,
    },
  ],
  total: 1,
  page: 1,
  page_size: 50,
}

describe('useRecords', () => {
  it('returns records from API', async () => {
    server.use(http.get('/api/records', () => HttpResponse.json(mockPage)))

    const { result } = renderHook(() => useRecords({}), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.total).toBe(1)
    expect(result.current.data?.items[0].is_istasyon_adi).toBe('IMM-2700-3')
  })

  it('returns empty list when API returns no records', async () => {
    const { result } = renderHook(() => useRecords({}), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toHaveLength(0)
  })

  it('sets isError on API failure', async () => {
    server.use(http.get('/api/records', () => HttpResponse.json({ detail: 'error' }, { status: 500 })))
    const { result } = renderHook(() => useRecords({}), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
