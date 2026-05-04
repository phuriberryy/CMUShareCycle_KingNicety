import { useEffect, useState } from 'react'
import { Users, Package, MessageCircle, Flag } from 'lucide-react'
import { adminApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const cards = [
  { key: 'totalUsers', label: 'ผู้ใช้ทั้งหมด', icon: Users, tone: 'blue' },
  { key: 'totalItems', label: 'สินค้าทั้งหมด', icon: Package, tone: 'green' },
  { key: 'totalChats', label: 'ห้องแชททั้งหมด', icon: MessageCircle, tone: 'teal' },
  { key: 'totalReports', label: 'รายงานทั้งหมด', icon: Flag, tone: 'orange' },
]

const toneClasses = {
  blue: 'from-blue-50 to-blue-100/40 text-blue-700',
  green: 'from-primary-light to-primary-light/60 text-primary-dark',
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
        if (mounted) setError(err.message || 'โหลดข้อมูลไม่สำเร็จ ลองรีโหลดหน้า')
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
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">ภาพรวมระบบ</h1>
        <p className="mt-1 text-sm text-gray-600">
          สถานะผู้ใช้ สินค้า แชท และรายงานในมุมมองเดียว
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          กำลังโหลดแดชบอร์ด…
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
              <p className="mt-1 text-xs font-semibold tracking-wide text-gray-500">
                {label}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

