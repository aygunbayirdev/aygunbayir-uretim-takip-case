import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { submissionsApi } from '../services/api'

export function useSubmissions() {
  return useQuery({
    queryKey: ['submissions'],
    queryFn: submissionsApi.list,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      const hasProcessing = items.some((s) => s.status === 'processing' || s.status === 'pending')
      return hasProcessing ? 3000 : false
    },
  })
}

export function useSendSubmissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submissionsApi.send,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
    },
  })
}

export function useRetrySubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => submissionsApi.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
    },
  })
}
