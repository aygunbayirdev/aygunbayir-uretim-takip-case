import type { ValidationStatus, SubmissionStatus } from '../../types'

type BadgeStatus = ValidationStatus | SubmissionStatus | 'error' | 'warning'

const CONFIG: Record<BadgeStatus, { label: string; className: string }> = {
  clean:      { label: 'Temiz',      className: 'bg-green-100 text-green-800' },
  warning:    { label: 'Uyarı',      className: 'bg-amber-100 text-amber-800' },
  rejected:   { label: 'Reddedildi', className: 'bg-red-100 text-red-800' },
  pending:    { label: 'Bekliyor',   className: 'bg-gray-100 text-gray-600' },
  processing: { label: 'İşleniyor', className: 'bg-blue-100 text-blue-800' },
  success:    { label: 'Başarılı',   className: 'bg-green-100 text-green-800' },
  failed:     { label: 'Başarısız',  className: 'bg-red-100 text-red-800' },
  error:      { label: 'Hata',       className: 'bg-red-100 text-red-800' },
}

interface Props {
  status: BadgeStatus
}

export default function StatusBadge({ status }: Props) {
  const cfg = CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
