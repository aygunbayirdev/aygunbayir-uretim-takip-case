import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/records', () =>
    HttpResponse.json({ items: [], total: 0, page: 1, page_size: 50 })
  ),
  http.get('/api/validation/issues', () =>
    HttpResponse.json({ items: [], total: 0, page: 1, page_size: 50 })
  ),
  http.get('/api/validation/summary', () =>
    HttpResponse.json({
      total_issues: 10,
      open_issues: 6,
      resolved_issues: 4,
      error_count: 3,
      warning_count: 3,
      by_rule: [],
    })
  ),
]

export const server = setupServer(...handlers)
