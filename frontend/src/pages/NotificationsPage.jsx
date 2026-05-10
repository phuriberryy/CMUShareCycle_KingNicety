import { useEffect, useState } from 'react'
import { Bell, Clock3, CheckCircle, XCircle, MessageCircle, ArrowRight, Heart, ArrowLeft, CheckCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { notificationApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function formatTimeAgo(date) {
  const now = new Date()
  const diff = now - new Date(date)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'เมื่อสักครู่'
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  return `${days} วันที่แล้ว`
}

function getNotificationIcon(type, title) {
  if (title === 'New message' || title === 'ข้อความใหม่' || type === 'message' || type === 'chat_message') {
    return <MessageCircle size={22} className="text-primary" />
  }
  switch (type) {
    case 'exchange_request':
      return <ArrowRight size={22} className="text-blue-500" />
    case 'exchange_accepted':
      return <CheckCircle size={22} className="text-primary" />
    case 'exchange_rejected':
      return <XCircle size={22} className="text-red-500" />
    case 'exchange_completed':
      return <MessageCircle size={22} className="text-primary" />
    case 'donation_request':
      return <Heart size={22} className="text-rose-500" />
    case 'donation_accepted':
      return <CheckCircle size={22} className="text-primary" />
    case 'donation_rejected':
      return <XCircle size={22} className="text-red-500" />
    default:
      return <Bell size={22} className="text-gray-500" />
  }
}

export default function NotificationsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!token) return
    setLoading(true)
    notificationApi
      .list(token)
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false))
  }, [token])

  const handleMarkAllRead = async () => {
    if (!token || unreadCount === 0 || markingAll) return
    setMarkingAll(true)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    window.dispatchEvent(new CustomEvent('sharecycle:markAllRead'))
    try {
      await notificationApi.markRead(token)
    } catch {
      notificationApi.list(token).then(setNotifications).catch(() => {})
    } finally {
      setMarkingAll(false)
    }
  }

  const handleMarkAsRead = async (notification) => {
    if (!token || notification.read) return
    try {
      await notificationApi.markNotificationRead(token, notification.id)
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
    } catch (err) {
      console.error(err)
    }
  }

  const handleClick = async (notification) => {
    const meta = notification.metadata || {}
    const exchangeId = meta.exchangeRequestId || meta.exchangeRequest_id
    const donationId = meta.donationRequestId || meta.donationRequest_id
    const chatId = meta.chatId || meta.chat_id
    const isMessage = notification.title === 'New message' || notification.title === 'ข้อความใหม่' || notification.type === 'message' || notification.type === 'chat_message'

    await handleMarkAsRead(notification)
    if (exchangeId) navigate(`/exchange/${exchangeId}`)
    else if (donationId) navigate(`/donation-requests/${donationId}`)
    else if (isMessage && chatId) navigate('/chat', { state: { chatId } })
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <p className="text-center text-gray-600">กรุณาเข้าสู่ระบบเพื่อดูการแจ้งเตือน</p>
          <Link to="/login" className="mt-4 inline-block text-primary font-semibold hover:underline">ไปหน้าเข้าสู่ระบบ</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link
            to="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
            aria-label="กลับ"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">การแจ้งเตือน</h1>
            <p className="text-sm text-gray-500">รายการแจ้งเตือนทั้งหมด</p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-primary transition hover:bg-primary/8 hover:text-primary-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="อ่านทั้งหมดแล้ว"
            >
              <CheckCheck size={16} />
              <span className="hidden sm:inline">อ่านทั้งหมดแล้ว</span>
            </button>
          )}
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading && (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
              กำลังโหลด...
            </div>
          )}
          {!loading && notifications.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
              <Bell size={48} className="mx-auto text-gray-300" />
              <p className="mt-4 text-base font-medium text-gray-700">ยังไม่มีการแจ้งเตือน</p>
              <p className="mt-1 text-sm text-gray-500">การแจ้งเตือนจะแสดงที่นี่</p>
            </div>
          )}
          {!loading &&
            notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleClick(notification)}
                className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
                  notification.read ? 'border-gray-200' : 'border-l-4 border-l-primary border-gray-200'
                }`}
              >
                <div className="flex gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      notification.read ? 'bg-gray-100' : 'bg-primary/10'
                    }`}
                  >
                    {getNotificationIcon(notification.type, notification.title)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900">{notification.title}</p>
                      {!notification.read && (
                        <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                          ใหม่
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600">{notification.body}</p>
                    <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                      <Clock3 size={14} />
                      {formatTimeAgo(notification.created_at)}
                    </p>
                    <p className="mt-2 flex items-center gap-1 text-sm font-medium text-primary">
                      ดูรายละเอียด
                      <ArrowRight size={16} />
                    </p>
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
