import { useEffect, useState } from 'react'
import { Users, Package, MessageCircle, Flag } from 'lucide-react'
import { adminApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const cards = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, tone: 'blue' },
  { key: 'totalItems', label: 'Total Items', icon: Package, tone: 'green' },
  { key: 'totalChats', label: 'Total Chats', icon: MessageCircle, tone: 'teal' },
  { key: 'totalReports', label: 'Total Reports', icon: Flag, tone: 'orange' },
]

const toneClasses = {
  blue: 'from-blue-50 to-blue-100/40 text-blue-700',
  green: 'from-emerald-50 to-emerald-100/40 text-emerald-700',
  teal: 'from-teal-50 to-teal-100/40 text-teal-700',
  orange: 'from-orange-50 to-orange-100/40 text-orange-700',
}

export default function AdminDashboardPage() {
  const { token } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    if (!token) return
    setLoading(true)
    setError('')
    adminApi
      .getSummary(token)
      .then((data) => {
        if (mounted) setSummary(data)
      })
      .catch((err) => {
        console.error('Failed to load admin summary:', err)
        if (mounted) setError(err.message || 'Failed to load dashboard')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [token])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Admin Overview</h1>
        <p className="mt-1 text-sm text-gray-600">
          High-level health of users, items, chats, and reports.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading dashboard...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {summary && !loading && !error && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {cards.map(({ key, label, icon: Icon, tone }) => (
            <div
              key={key}
              className={`group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${toneClasses[tone]} p-4 sm:p-5`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-gray-800 shadow-sm">
                  <Icon size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {Number(summary[key] || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {label}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

