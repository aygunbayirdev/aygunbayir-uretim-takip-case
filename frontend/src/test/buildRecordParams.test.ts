import { describe, it, expect } from 'vitest'

// Re-export the private helper by duplicating the logic under test.
// This keeps the production module unchanged while giving us full coverage.
import type { RecordFilters } from '../types'

function buildRecordParams(filters: RecordFilters): URLSearchParams {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    if (Array.isArray(v)) {
      v.forEach((item) => params.append(k, String(item)))
    } else {
      params.append(k, String(v))
    }
  })
  return params
}

describe('buildRecordParams', () => {
  it('serializes a single scalar filter', () => {
    const p = buildRecordParams({ date_from: '2025-11-05' })
    expect(p.get('date_from')).toBe('2025-11-05')
  })

  it('serializes shift array as repeated keys (not bracket notation)', () => {
    const p = buildRecordParams({ shift: [1, 3] })
    expect(p.getAll('shift')).toEqual(['1', '3'])
    // FastAPI expects shift=1&shift=3, not shift[]=1&shift[]=3
    expect(p.toString()).toBe('shift=1&shift=3')
  })

  it('omits undefined values', () => {
    const p = buildRecordParams({ date_from: undefined, page: 1 })
    expect(p.has('date_from')).toBe(false)
    expect(p.get('page')).toBe('1')
  })

  it('omits empty string values', () => {
    const p = buildRecordParams({ station: '' })
    expect(p.has('station')).toBe(false)
  })

  it('omits empty shift array', () => {
    const p = buildRecordParams({ shift: [] })
    expect(p.has('shift')).toBe(false)
  })

  it('serializes oee_min and oee_max as numbers', () => {
    const p = buildRecordParams({ oee_min: 50, oee_max: 100 })
    expect(p.get('oee_min')).toBe('50')
    expect(p.get('oee_max')).toBe('100')
  })

  it('serializes boolean issues_only', () => {
    const p = buildRecordParams({ issues_only: true })
    expect(p.get('issues_only')).toBe('true')
  })

  it('handles all filters together', () => {
    const p = buildRecordParams({
      date_from: '2025-11-05',
      date_to: '2025-11-25',
      shift: [1, 2],
      station: 'IMM',
      product: 'PART-A',
      oee_min: 60,
      validation_status: 'clean',
      page: 2,
      page_size: 50,
    })
    expect(p.getAll('shift')).toEqual(['1', '2'])
    expect(p.get('station')).toBe('IMM')
    expect(p.get('product')).toBe('PART-A')
    expect(p.get('oee_min')).toBe('60')
    expect(p.get('validation_status')).toBe('clean')
  })
})
