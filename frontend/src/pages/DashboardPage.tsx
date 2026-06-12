import { useKpi, useOeeTrend, useByShift, useByStation, useQualityDist } from '../hooks/useDashboard'
import KpiCards from '../components/dashboard/KpiCards'
import OeeTrendChart from '../components/dashboard/OeeTrendChart'
import ShiftComparisonChart from '../components/dashboard/ShiftComparisonChart'
import StationRankingChart from '../components/dashboard/StationRankingChart'
import QualityDistributionChart from '../components/dashboard/QualityDistributionChart'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
}

export default function DashboardPage() {
  const kpi        = useKpi()
  const trend      = useOeeTrend()
  const byShift    = useByShift()
  const byStation  = useByStation()
  const qualityDist = useQualityDist()

  const loading = kpi.isLoading || trend.isLoading || byShift.isLoading || byStation.isLoading || qualityDist.isLoading
  const error   = kpi.error || trend.error || byShift.error || byStation.error || qualityDist.error

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-medium">Veriler yüklenemedi.</p>
          <p className="text-gray-500 text-sm mt-1">Backend bağlantısını kontrol edin.</p>
        </div>
      </div>
    )
  }

  if (!kpi.data || kpi.data.total_records === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 font-medium">Henüz veri yok.</p>
          <p className="text-gray-400 text-sm mt-1">
            Başlamak için{' '}
            <a href="/import" className="text-blue-600 hover:underline">CSV dosyası yükleyin</a>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* KPI Kartları */}
      <KpiCards data={kpi.data} />

      {/* OEE Trend */}
      <OeeTrendChart data={trend.data ?? []} />

      {/* Vardiya + İstasyon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ShiftComparisonChart data={byShift.data ?? []} />
        <QualityDistributionChart data={qualityDist.data ?? []} />
      </div>

      {/* İstasyon Ranking */}
      <StationRankingChart data={byStation.data ?? []} />
    </div>
  )
}
