import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { OeeTrendItem } from '../../types'

interface Props {
  data: OeeTrendItem[]
}

export default function OeeTrendChart({ data }: Props) {
  if (data.length === 0) {
    return <EmptyState />
  }

  return (
    <ChartCard title="OEE Trend (Günlük)">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => v.slice(5)}  // MM-DD
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Legend />
          <Line type="monotone" dataKey="avg_oee"          name="OEE"           stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="avg_availability" name="Kullanılırlık" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="avg_performance"  name="Performans"    stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="avg_quality"      name="Kalite"        stroke="#8b5cf6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function EmptyState() {
  return (
    <ChartCard title="OEE Trend (Günlük)">
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Gösterilecek veri yok
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
