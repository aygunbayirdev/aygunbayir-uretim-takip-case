import { AlertTriangle, XCircle } from 'lucide-react'

interface Props {
  severity: string
}

export default function SeverityBadge({ severity }: Props) {
  if (severity === 'error') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle size={11} /> Hata
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <AlertTriangle size={11} /> Uyarı
    </span>
  )
}
