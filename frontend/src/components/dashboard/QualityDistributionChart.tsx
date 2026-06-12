import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { QualityDistItem } from '../../types'

interface Props {
  data: QualityDistItem[]
}

export default function QualityDistributionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <ChartCard title="İstasyon Bazlı Fire Oranı (%)">
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Gösterilecek veri yok</div>
      </ChartCard>
    )
  }

  const chartData = data
    .filter((d) => d.defect_rate != null)
    .slice(0, 15)
    .map((d) => ({ name: d.station, fire: d.defect_rate, toplam: d.total_produced }))

  return (
    <ChartCard title="İstasyon Bazlı Fire Oranı (%)">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, angle: -35, textAnchor: 'end' }}
            interval={0}
          />
          <YAxis tick={{ fontSize: 11 }} unit="%" />
          <Tooltip
            formatter={(v: number, name: string) =>
              name === 'fire' ? [`${v}%`, 'Fire Oranı'] : [v.toLocaleString('tr-TR'), 'Toplam Üretim']
            }
          />
          <Bar dataKey="fire" name="fire" fill="#ef4444" radius={[4, 4, 0, 0]} />
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
