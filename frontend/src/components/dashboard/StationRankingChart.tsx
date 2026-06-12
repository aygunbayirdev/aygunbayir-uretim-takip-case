import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { StationStatItem } from '../../types'

interface Props {
  data: StationStatItem[]
}

function oeeColor(oee: number | null): string {
  if (oee == null) return '#94a3b8'
  if (oee >= 75) return '#10b981'
  if (oee >= 50) return '#f59e0b'
  return '#ef4444'
}

export default function StationRankingChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <ChartCard title="İstasyon OEE Sıralaması">
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Gösterilecek veri yok</div>
      </ChartCard>
    )
  }

  const chartData = data.slice(0, 15)  // en fazla 15 istasyon göster
  const barHeight = Math.max(260, chartData.length * 28)

  return (
    <ChartCard title="İstasyon OEE Sıralaması">
      <ResponsiveContainer width="100%" height={barHeight}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <YAxis
            type="category"
            dataKey="station"
            tick={{ fontSize: 11 }}
            width={130}
          />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Bar dataKey="avg_oee" name="OEE" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={oeeColor(entry.avg_oee)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> ≥75%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> 50–75%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> &lt;50%</span>
      </div>
    </ChartCard>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  )
}
