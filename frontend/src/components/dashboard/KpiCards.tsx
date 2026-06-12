import type { KpiData } from '../../types'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  color: string
}

function KpiCard({ label, value, sub, color }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

interface Props {
  data: KpiData
}

export default function KpiCards({ data }: Props) {
  const oee = data.avg_oee != null ? `${data.avg_oee}%` : '—'
  const defect = data.defect_rate != null ? `${data.defect_rate}%` : '—'
  const produced = data.total_produced.toLocaleString('tr-TR')

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Ortalama OEE"
        value={oee}
        sub={`${data.date_min ?? '—'} — ${data.date_max ?? '—'}`}
        color="text-blue-600"
      />
      <KpiCard
        label="Toplam Üretim"
        value={produced}
        sub={`Fire: ${data.total_defective.toLocaleString('tr-TR')} adet`}
        color="text-gray-900"
      />
      <KpiCard
        label="Fire Oranı"
        value={defect}
        sub={`Ort. Kalite: ${data.avg_quality != null ? `${data.avg_quality}%` : '—'}`}
        color={data.defect_rate != null && data.defect_rate > 5 ? 'text-red-600' : 'text-green-600'}
      />
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-medium text-gray-500">Kayıt Durumu</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{data.total_records.toLocaleString('tr-TR')}</p>
        <div className="mt-2 flex gap-2 flex-wrap">
          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
            {data.clean_count} temiz
          </span>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            {data.warning_count} uyarı
          </span>
          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
            {data.rejected_count} reddedildi
          </span>
        </div>
      </div>
    </div>
  )
}
