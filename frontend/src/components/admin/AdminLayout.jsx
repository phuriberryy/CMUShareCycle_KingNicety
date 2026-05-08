import { useEffect, useState } from 'react'
import { NavLink, Routes, Route } from 'react-router-dom'
import { LayoutDashboard, Users, Package, Flag, MessageCircle, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AdminDashboardPage from '../../pages/admin/AdminDashboardPage'
import AdminUsersPage from '../../pages/admin/AdminUsersPage'
import AdminItemsPage from '../../pages/admin/AdminItemsPage'
import AdminReportsPage from '../../pages/admin/AdminReportsPage'
import AdminChatsPage from '../../pages/admin/AdminChatsPage'

const navItems = [
  { to: '/admin', label: 'ภาพรวม', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'ผู้ใช้', icon: Users },
  { to: '/admin/items', label: 'สินค้า', icon: Package },
  { to: '/admin/reports', label: 'รายงาน', icon: Flag },
  { to: '/admin/chats', label: 'แชท', icon: MessageCircle },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  useEffect(() => setSidebarOpen(false), [])

  return (
    <div className="min-h-screen bg-surface text-gray-900">
      <div className="flex flex-col md:flex-row">
        <aside className="md:w-64">
          <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 md:px-6 md:py-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wide text-primary">CMU ShareCycle</span>
              <span className="text-sm font-bold text-gray-900">แผงผู้ดูแลระบบ</span>
            </div>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-600 md:hidden"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="เปิดเมนูแอดมิน"
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {sidebarOpen && <button type="button" aria-label="ปิดเมนูแอดมิน" className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />}

          <nav
            className={`fixed inset-x-0 top-[57px] z-40 max-h-[calc(100vh-57px)] overflow-y-auto border-b border-gray-100 bg-white px-4 py-4 shadow-xl md:static md:max-h-none md:border-r md:border-b-0 md:px-3 md:py-4 md:shadow-none ${
              sidebarOpen ? 'block' : 'hidden md:block'
            }`}
          >
            <div className="space-y-1">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${
                      isActive
                        ? 'bg-primary text-white shadow-sm hover:bg-primary-dark hover:text-white'
                        : 'text-gray-800 hover:bg-primary-light/80 hover:text-primary-dark'
                    }`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
            {user && (
              <div className="mt-6 hidden border-t border-gray-100 pt-4 md:block">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">เข้าสู่ระบบในชื่อ</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </nav>
        </aside>

        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <Routes>
            <Route path="/" element={<AdminDashboardPage />} />
            <Route path="/users" element={<AdminUsersPage />} />
            <Route path="/items" element={<AdminItemsPage />} />
            <Route path="/reports" element={<AdminReportsPage />} />
            <Route path="/chats" element={<AdminChatsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

