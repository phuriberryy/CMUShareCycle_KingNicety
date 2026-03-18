import { useState } from 'react'
import { NavLink, Routes, Route } from 'react-router-dom'
import { LayoutDashboard, Users, Package, Flag, MessageCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AdminDashboardPage from '../../pages/admin/AdminDashboardPage'
import AdminUsersPage from '../../pages/admin/AdminUsersPage'
import AdminItemsPage from '../../pages/admin/AdminItemsPage'
import AdminReportsPage from '../../pages/admin/AdminReportsPage'
import AdminChatsPage from '../../pages/admin/AdminChatsPage'

const navItems = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/items', label: 'Items', icon: Package },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/chats', label: 'Chats', icon: MessageCircle },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#FAFBF9] text-gray-900">
      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="md:w-64">
          <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 md:px-6 md:py-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">CMU ShareCycle</span>
              <span className="text-sm font-bold text-gray-900">Admin Panel</span>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 md:hidden"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              <span className="sr-only">Toggle navigation</span>
              <span className="h-0.5 w-4 bg-gray-700" />
            </button>
          </div>

          <nav
            className={`border-b border-gray-100 bg-white md:h-[calc(100vh-64px)] md:border-r md:border-b-0 md:px-3 md:py-4 ${
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
                    `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'
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
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Signed in as
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            )}
          </nav>
        </aside>

        {/* Main content */}
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

