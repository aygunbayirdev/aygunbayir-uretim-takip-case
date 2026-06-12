import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { validationApi } from '../services/api'
import type { ResolveIssueRequest } from '../types'

export function useValidationIssues(params: {
  record_id?: number
  resolved?: boolean
  severity?: string
  rule_code?: string
} = {}) {
  return useQuery({
    queryKey: ['validation', 'issues', params],
    queryFn: () => validationApi.listIssues(params),
  })
}

export function useValidationSummary() {
  return useQuery({
    queryKey: ['validation', 'summary'],
    queryFn: validationApi.getSummary,
  })
}

export function useResolveIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ResolveIssueRequest }) =>
      validationApi.resolveIssue(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation'] })
    },
  })
}
