import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recordsApi } from '../services/api'
import type { RecordFilters, PatchRecordRequest } from '../types'

export function useRecords(filters: RecordFilters) {
  return useQuery({
    queryKey: ['records', filters],
    queryFn: () => recordsApi.list(filters),
    placeholderData: (prev) => prev,  // keep previous data while fetching
  })
}

export function usePatchRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PatchRecordRequest }) =>
      recordsApi.patch(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
    },
  })
}
