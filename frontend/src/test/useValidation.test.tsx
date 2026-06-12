import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { server } from './server'
import { useValidationSummary, useValidationIssues } from '../hooks/useValidation'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useValidationSummary', () => {
  it('returns summary counts from API', async () => {
    const { result } = renderHook(() => useValidationSummary(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.total_issues).toBe(10)
    expect(result.current.data?.open_issues).toBe(6)
    expect(result.current.data?.resolved_issues).toBe(4)
    expect(result.current.data?.error_count).toBe(3)
    expect(result.current.data?.warning_count).toBe(3)
  })

  it('sets isError on API failure', async () => {
    server.use(
      http.get('/api/validation/summary', () =>
        HttpResponse.json({ detail: 'error' }, { status: 500 })
      )
    )
    const { result } = renderHook(() => useValidationSummary(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useValidationIssues', () => {
  it('returns empty issue list from default handler', async () => {
    const { result } = renderHook(() => useValidationIssues({ page: 1, page_size: 50 }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toHaveLength(0)
    expect(result.current.data?.total).toBe(0)
  })

  it('returns issues when API returns data', async () => {
    server.use(
      http.get('/api/validation/issues', () =>
        HttpResponse.json({
          items: [
            {
              id: 1, record_id: 42, rule_code: 'VC-01',
              severity: 'error', field_name: 'hatali_miktar',
              message: 'Fire > Üretim', suggested_action: 'reject',
              resolved: 0, resolved_at: null, resolved_by: null, correction_note: null,
            },
          ],
          total: 1,
          page: 1,
          page_size: 50,
        })
      )
    )
    const { result } = renderHook(() => useValidationIssues({ page: 1, page_size: 50 }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.total).toBe(1)
    expect(result.current.data?.items[0].rule_code).toBe('VC-01')
    expect(result.current.data?.items[0].severity).toBe('error')
  })
})
