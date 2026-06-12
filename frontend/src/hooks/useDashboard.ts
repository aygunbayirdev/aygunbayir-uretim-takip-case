import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../services/api'

export function useKpi() {
  return useQuery({
    queryKey: ['dashboard', 'kpi'],
    queryFn: dashboardApi.getKpi,
  })
}

export function useOeeTrend(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard', 'oee-trend', dateFrom, dateTo],
    queryFn: () => dashboardApi.getOeeTrend(dateFrom, dateTo),
  })
}

export function useByShift() {
  return useQuery({
    queryKey: ['dashboard', 'by-shift'],
    queryFn: dashboardApi.getByShift,
  })
}

export function useByStation() {
  return useQuery({
    queryKey: ['dashboard', 'by-station'],
    queryFn: dashboardApi.getByStation,
  })
}

export function useQualityDist() {
  return useQuery({
    queryKey: ['dashboard', 'quality-dist'],
    queryFn: dashboardApi.getQualityDist,
  })
}
