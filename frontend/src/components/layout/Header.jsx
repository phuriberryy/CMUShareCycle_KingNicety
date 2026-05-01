import { Bell, Menu, X, Leaf, Trophy, MessageCircle, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Leaderboard', to: '/leaderboard', icon: Trophy },
]

function Header({ unread, onNotificationsClick }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const onLogin = () => navigate('/login')
  const { user, logout } = useAuth()
  const initials = useMemo(() => {
    if (!user?.name) return 'CM'
    return user.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [user])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-4 lg:px-8">
        <Link to="/" className="flex min-h-11 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-md sm:h-12 sm:w-12">
            <Leaf size={18} className="sm:hidden" />
            <Leaf size={24} className="hidden sm:block" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-primary sm:text-lg">CMU ShareCycle</p>
            <p className="hidden text-xs text-gray-600 sm:block">Green Campus</p>
          </div>
        </Link>

        <div className="hidden items-center gap-3 sm:flex">
          <nav className="flex items-center gap-2 text-sm font-semibold">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-5 py-2.5 transition ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/chat"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 text-gray-700 transition hover:bg-gray-50"
            aria-label="แชท"
          >
            <MessageCircle size={20} />
          </Link>
          <button
            type="button"
            onClick={onNotificationsClick}
            className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 text-gray-700 transition hover:bg-gray-50"
            aria-label="การแจ้งเตือน"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unread}
              </span>
            )}
          </button>
          {user ? (
            <>
              <Link
                to="/profile"
                className="flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-gray-300"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                  {initials}
                </span>
                <span>{user.name.split(' ')[0]}</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="min-h-11 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                ออกจากระบบ
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className={`min-h-11 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                location.pathname === '/login'
                  ? 'bg-primary text-white shadow-md'
                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:hidden">
          <Link
            to="/chat"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 active:scale-95"
            aria-label="แชท"
          >
            <MessageCircle size={18} />
          </Link>
          <button
            type="button"
            onClick={onNotificationsClick}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 active:scale-95"
            aria-label="การแจ้งเตือน"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unread}
              </span>
            )}
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 active:scale-95"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-30 cursor-default bg-black/20 sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-40 border-t border-gray-200 bg-white px-4 py-4 shadow-xl sm:hidden">
            <div className="space-y-2">
              <Link
                to="/chat"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <MessageCircle size={18} />
                  แชท
                </span>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onNotificationsClick()
                }}
                className="flex min-h-11 w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <Bell size={18} />
                  การแจ้งเตือน
                </span>
                <span className="flex items-center gap-2 text-gray-400">
                  {unread > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                      {unread}
                    </span>
                  )}
                  <ChevronRight size={16} />
                </span>
              </button>
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-50'
                    }`
                  }
                >
                  <span>{link.label}</span>
                  <ChevronRight size={16} className="opacity-70" />
                </NavLink>
              ))}
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              {user ? (
                <div className="space-y-2">
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <span>โปรไฟล์ของฉัน</span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      setOpen(false)
                    }}
                    className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onLogin()
                    setOpen(false)
                  }}
                  className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700"
                >
                  เข้าสู่ระบบ
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  )
}

export default Header










