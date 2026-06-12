import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useOeeTrend } from '../../hooks/useDashboard'

type Granularity = 'daily' | 'weekly' | 'monthly'

const LABELS: Record<Granularity, string> = {
  daily: 'Günlük',
  weekly: 'Haftalık',
  monthly: 'Aylık',
}

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

function formatTick(value: string, granularity: Granularity): string {
  if (granularity === 'daily') return value.slice(5)           // "MM-DD"
  if (granularity === 'weekly') {
    const week = value.split('-W')[1]
    return `H${week}`                                          // "H03"
  }
  // monthly: "YYYY-MM" → "Oca'24"
  const [year, month] = value.split('-')
  return `${TR_MONTHS[parseInt(month) - 1]}'${year.slice(2)}`
}

export default function OeeTrendChart() {
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const { data = [], isLoading } = useOeeTrend(undefined, undefined, granularity)

  const title = `OEE Trend (${LABELS[granularity]})`

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          {(['daily', 'weekly', 'monthly'] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1.5 transition-colors ${
                granularity === g
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Yükleniyor...
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Gösterilecek veri yok
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatTick(v, granularity)}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip
              formatter={(v: number) => `${v}%`}
              labelFormatter={(v) => formatTick(v, granularity)}
            />
            <Legend />
            <Line type="monotone" dataKey="avg_oee"          name="OEE"           stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="avg_availability" name="Kullanılırlık" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="avg_performance"  name="Performans"    stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="avg_quality"      name="Kalite"        stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
