import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { ShiftStatItem } from '../../types'

interface Props {
  data: ShiftStatItem[]
}

const SHIFT_LABEL: Record<number, string> = { 1: '1. Vardiya', 2: '2. Vardiya', 3: '3. Vardiya' }

export default function ShiftComparisonChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    name: SHIFT_LABEL[d.shift] ?? `Vardiya ${d.shift}`,
  }))

  if (chartData.length === 0) {
    return (
      <ChartCard title="Vardiya Karşılaştırması">
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Gösterilecek veri yok</div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Vardiya Karşılaştırması">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Legend />
          <Bar dataKey="avg_oee"          name="OEE"           fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="avg_availability" name="Kullanılırlık" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="avg_performance"  name="Performans"    fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="avg_quality"      name="Kalite"        fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
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
