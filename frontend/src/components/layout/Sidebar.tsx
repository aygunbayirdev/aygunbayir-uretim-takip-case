import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  Table2,
  AlertTriangle,
  Send,
  Factory,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',        icon: LayoutDashboard },
  { to: '/import',      label: 'Veri İçe Aktar',   icon: Upload },
  { to: '/records',     label: 'Kayıtlar',          icon: Table2 },
  { to: '/validation',  label: 'Validasyon',        icon: AlertTriangle },
  { to: '/submissions', label: 'API Gönderim',      icon: Send },
]

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-60 min-h-screen bg-slate-900 text-slate-100 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
          <Factory size={20} className="text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">OEE Takip</p>
          <p className="text-xs text-slate-400">ACME Automotive</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
              ].join(' ')
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">v1.0.0</p>
      </div>
    </aside>
  )
}
