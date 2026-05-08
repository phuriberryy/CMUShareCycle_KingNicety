import { Bell, Menu, X, Trophy, MessageCircle, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ShareCycleLogo from '../brand/ShareCycleLogo'
import { APP_ROUTES } from '../../shared/constants/routes'

const navLinks = [
  { label: 'หน้าแรก', to: APP_ROUTES.home },
  { label: 'กระดานคะแนน', to: APP_ROUTES.leaderboard, icon: Trophy },
]

function Header({ unread, onNotificationsClick }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const onLogin = () => navigate(APP_ROUTES.login)
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
    <header className="sticky top-0 z-40 w-full min-w-0 border-b border-primary/10 bg-white/92 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex w-full min-w-0 max-w-5xl items-center justify-between gap-2 py-2 pl-[max(0.9rem,env(safe-area-inset-left,0px))] pr-[max(0.9rem,env(safe-area-inset-right,0px))] sm:gap-3 sm:px-6 sm:py-2.5 lg:px-8">
        <Link
          to={APP_ROUTES.home}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 sm:flex-initial sm:gap-2.5"
        >
          <ShareCycleLogo className="h-7 w-auto shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 ring-primary/10 sm:h-9 sm:w-auto sm:rounded-2xl lg:h-9" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[0.84rem] font-semibold text-primary-dark sm:text-base">
              <span className="font-bold">CMU</span>
              <span className="font-medium"> ShareCycle</span>
            </p>
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
                      ? 'bg-primary text-white shadow-md hover:bg-primary-dark hover:text-white focus-visible:bg-primary-dark focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80'
                      : 'text-gray-800 hover:bg-primary-light/80 hover:text-primary-dark'
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
                  ? 'bg-primary text-white shadow-md hover:bg-primary-dark hover:text-white'
                  : 'border border-gray-200 text-gray-800 hover:bg-primary-light/80 hover:text-primary-dark'
              }`}
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:hidden">
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
            aria-label="เปิดเมนู"
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
            aria-label="ปิดเมนูนำทาง"
            className="fixed inset-0 z-30 cursor-default bg-black/25 sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 top-[calc(100%+0px)] z-40 rounded-b-3xl border-t border-gray-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 shadow-2xl sm:hidden">
            <div className="mx-auto max-w-md space-y-2">
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
                      isActive
                        ? 'bg-primary text-white hover:bg-primary-dark hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80'
                        : 'text-gray-800 hover:bg-primary-light/70 hover:text-primary-dark'
                    }`
                  }
                >
                  <span>{link.label}</span>
                  <ChevronRight size={16} className="opacity-70" />
                </NavLink>
              ))}
            </div>
            <div className="mx-auto mt-4 max-w-md border-t border-gray-100 pt-4">
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










