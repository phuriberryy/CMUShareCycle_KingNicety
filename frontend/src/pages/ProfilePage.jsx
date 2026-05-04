import { useMemo, useState, useEffect } from 'react'
import {
  ArrowRightLeft,
  User,
  Mail,
  Package,
  CheckCircle,
  Image as ImageIcon,
  Eye,
  Clock3,
  Heart,
  Trash2,
  Star,
  Box,
  History,
  TimerReset,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { profileApi, exchangeApi, donationApi, itemsApi, API_BASE } from '../lib/api'
import { io } from 'socket.io-client'
import EditItemModal from '../components/modals/EditItemModal'
import { itemCoverUrl } from '../utils/itemImages'
import ManageItemModal from '../components/modals/ManageItemModal'

const fetchMyItems = async ({ token, activeTab, setMyItems }) => {
  // Fetch items เมื่อ activeTab เป็น 'posts' หรือ 'expired' เพื่อให้แสดงทั้ง active และ expired items
  if (!token || (activeTab !== 'posts' && activeTab !== 'expired')) return

  try {
    const data = await profileApi.getMyItems(token)
    setMyItems(data)
  } catch (err) {
    console.error('Failed to fetch my items:', err)
  }
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('posts')
  const [profile, setProfile] = useState(null)
  const [myItems, setMyItems] = useState([])
  const [exchangeHistory, setExchangeHistory] = useState([])
  const [exchangeRequests, setExchangeRequests] = useState([])
  const [donationHistory, setDonationHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditItemModal, setShowEditItemModal] = useState(false)
  const [showManageItemModal, setShowManageItemModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const { user, token } = useAuth()
  const toast = useToast()

  // แยก items ที่หมดอายุแล้วแต่ยังไม่ถูกแลกเปลี่ยน
  const activeItems = myItems.filter(item => !item.is_expired)
  const expiredItems = myItems.filter(item => item.is_expired)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const data = await profileApi.getProfile(token)
        setProfile(data)
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [token])

  useEffect(() => {
    fetchMyItems({ token, activeTab, setMyItems })
  }, [token, activeTab])

  // Real-time updates via socket.io
  useEffect(() => {
    if (!token) return

    const socket = io(API_BASE.replace(/\/api$/, ''), {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      transports: ['polling', 'websocket'],
      upgrade: true,
    })

    socket.on('connect_error', (err) => {
      // Silently handle connection errors - backend might not be running
      if (err.message !== 'websocket error' && err.message !== 'xhr poll error') {
        console.debug('Socket connection error:', err.message)
      }
    })

    socket.on('item:updated', () => {
      if (activeTab === 'posts' || activeTab === 'expired') {
        fetchMyItems({ token, activeTab, setMyItems })
      }
    })

    socket.on('item:deleted', () => {
      if (activeTab === 'posts' || activeTab === 'expired') {
        fetchMyItems({ token, activeTab, setMyItems })
      }
    })

    socket.on('exchange:completed', () => {
      if (activeTab === 'history') {
        profileApi.getExchangeHistory(token)
          .then(setExchangeHistory)
          .catch((err) => console.error('Failed to refresh exchange history:', err))
      }
      if (activeTab === 'posts' || activeTab === 'expired') {
        fetchMyItems({ token, activeTab, setMyItems })
      }
    })

    socket.on('donation:completed', () => {
      if (activeTab === 'donations') {
        donationApi.getMyDonations(token)
          .then(setDonationHistory)
          .catch((err) => console.error('Failed to refresh donation history:', err))
      }
      if (activeTab === 'posts' || activeTab === 'expired') {
        fetchMyItems({ token, activeTab, setMyItems })
      }
    })

    socket.on('notification:new', () => {
      // Refresh exchange requests count if needed
      if (activeTab === 'posts') {
        exchangeApi.getMyRequests(token)
          .then(setExchangeRequests)
          .catch((err) => console.error('Failed to refresh exchange requests:', err))
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [token, activeTab])

  useEffect(() => {
    const fetchExchangeHistory = async () => {
      if (!token || activeTab !== 'history') return

      try {
        const data = await profileApi.getExchangeHistory(token)
        setExchangeHistory(data)
      } catch (err) {
        console.error('Failed to fetch exchange history:', err)
      }
    }

    fetchExchangeHistory()
  }, [token, activeTab])

  useEffect(() => {
    const fetchDonationHistory = async () => {
      if (!token || activeTab !== 'donations') return

      try {
        const data = await donationApi.getMyDonations(token)
        setDonationHistory(data)
      } catch (err) {
        console.error('Failed to fetch donation history:', err)
      }
    }

    fetchDonationHistory()
  }, [token, activeTab])

  useEffect(() => {
    const fetchExchangeRequests = async () => {
      if (!token || activeTab !== 'posts') return

      try {
        const data = await exchangeApi.getMyRequests(token)
        setExchangeRequests(data)
      } catch (err) {
        console.error('Failed to fetch exchange requests:', err)
      }
    }

    fetchExchangeRequests()
  }, [token, activeTab])

  const getItemViews = (itemId) => {
    // นับจำนวน exchange requests สำหรับ item นี้
    if (!exchangeRequests || !Array.isArray(exchangeRequests)) return 0
    const count = exchangeRequests.filter((er) => er && er.item_id === itemId).length
    return count
  }

  const canEditItem = (item) => {
    // ตรวจสอบว่ามี exchange request ที่ accept แล้วหรือไม่
    if (!exchangeRequests || !Array.isArray(exchangeRequests)) return true
    const hasAcceptedRequest = exchangeRequests.some((er) => 
      er && 
      er.item_id === item.id && 
      (er.status === 'chatting' || 
       er.status === 'in_progress' || 
       er.owner_accepted === true || 
       er.requester_accepted === true)
    )
    return !hasAcceptedRequest
  }

  const handleEditItem = (item) => {
    setSelectedItem(item)
    setShowEditItemModal(true)
  }

  const handleManageItem = (item) => {
    setSelectedItem(item)
    setShowManageItemModal(true)
  }

  const handleDeleteItem = async (item) => {
    if (!token) return
    
    if (!window.confirm(`Are you sure you want to delete "${item.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      await itemsApi.delete(token, item.id)
      toast.success('ลบโพสต์สำเร็จ!', 'สำเร็จ')
      // Refresh items list
      if (activeTab === 'posts' || activeTab === 'expired') {
        const data = await profileApi.getMyItems(token)
        setMyItems(data)
      }
    } catch (err) {
      console.error('Failed to delete item:', err)
      toast.error(err.message || 'ไม่สามารถลบโพสต์ได้', 'เกิดข้อผิดพลาด')
    }
  }

  const handleItemUpdate = async () => {
    // Refresh items list เมื่อแก้ไข item เพื่อให้ expired items อัปเดต
    if (token && (activeTab === 'posts' || activeTab === 'expired')) {
      try {
        const data = await profileApi.getMyItems(token)
        setMyItems(data)
      } catch (err) {
        console.error('Failed to refresh items:', err)
      }
    }
  }


  const initials = useMemo(() => {
    if (!user?.name) return 'YO'
    return user.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [user])

  const tabItems = [
    { id: 'posts', label: 'โพสต์', shortLabel: 'โพสต์', icon: Box },
    { id: 'expired', label: 'หมดอายุ', shortLabel: 'หมดอายุ', icon: TimerReset },
    { id: 'history', label: 'ประวัติแลก', shortLabel: 'แลก', icon: History },
    { id: 'donations', label: 'บริจาค', shortLabel: 'บริจาค', icon: Heart },
  ]

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg text-gray-600">กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg text-gray-600">กำลังโหลด...</p>
      </div>
    )
  }

  const displayUser = profile?.user || user
  const stats = profile?.stats || { itemsShared: 0, co2Reduced: '0.00' }
  const statCards = [
    { key: 'points', label: 'คะแนน', value: (stats.totalPoints || 0).toLocaleString(), icon: Star, tone: 'primary' },
    { key: 'shared', label: 'สิ่งของที่แบ่งปัน', value: stats.itemsShared || 0, icon: Package, tone: 'green' },
    { key: 'co2', label: 'CO₂ ที่ลดได้', value: `${stats.co2Reduced || '0.00'} กก.`, icon: CheckCircle, tone: 'primary' },
    { key: 'exchanges', label: 'การแลกเปลี่ยน', value: stats.totalExchanges || 0, icon: ArrowRightLeft, tone: 'purple' },
    { key: 'donations', label: 'การบริจาค', value: stats.totalDonations || 0, icon: Heart, tone: 'rose' },
  ]

  return (
    <div className="min-h-screen w-full min-w-0 bg-surface">
      <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <section className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated ring-1 ring-black/[0.03]">
        <div className="h-28 sm:h-40 bg-gradient-to-r from-primary-dark via-primary to-primary-bright" />
        <div className="relative px-4 sm:px-8 pb-8 sm:pb-10 pt-4">
          <div className="absolute -top-12 sm:-top-16 left-4 sm:left-10 flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-full border-4 sm:border-[6px] border-white bg-primary text-2xl sm:text-4xl font-bold text-white shadow-md">
            {initials}
          </div>

          <div className="mt-14 sm:mt-16 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{displayUser.name || 'ชื่อผู้ใช้'}</h1>
              <div className="mt-4 space-y-3">
                {displayUser.faculty && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">คณะ / หน่วยงาน</p>
                      <p className="text-base font-semibold text-gray-900">{displayUser.faculty}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Mail size={20} className="text-primary" />
                </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">อีเมล</p>
                    <p className="text-base font-semibold text-gray-900">{displayUser.email}</p>
                </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-5 sm:mt-6 sm:pt-6">
            <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary-light/50 via-white/90 to-surface-light/80 p-3 shadow-sm sm:p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
                {statCards.map((stat, idx) => (
                  <div
                    key={stat.key}
                    className={`flex flex-col rounded-xl border border-gray-100/90 bg-white/95 px-3 py-2.5 shadow-sm transition hover:border-primary/20 hover:bg-white hover:shadow-md sm:min-w-0 sm:px-3 sm:py-3 ${idx === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
                  >
                    <div
                      className={`mb-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${stat.tone === 'primary' ? 'bg-primary/10 text-primary' : stat.tone === 'green' ? 'bg-primary/10 text-primary' : stat.tone === 'emerald' ? 'bg-primary/10 text-primary' : stat.tone === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'}`}
                    >
                      <stat.icon size={16} strokeWidth={2} />
                    </div>
                    <p className="text-lg font-bold tabular-nums tracking-tight text-gray-900 sm:text-xl">{stat.value}</p>
                    <p className="mt-0.5 text-[11px] font-medium leading-snug text-gray-600 sm:text-xs">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-4 py-4 sm:px-8 sm:py-4">
          {/* แบ่งพื้นที่เท่ากัน 4 ช่อง — ไม่ชิดซ้ายเหลือว่างขวาเหมือน flex + flex-initial */}
          <div className="grid grid-cols-4 gap-1.5 rounded-full bg-primary-light p-1.5 sm:gap-2 sm:p-2">
            {tabItems.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const badge = tab.id === 'expired' ? expiredItems.length : tab.id === 'donations' ? donationHistory.length : null
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  aria-label={tab.label}
                  className={`flex min-h-11 min-w-0 w-full flex-row flex-wrap items-center justify-center gap-x-0.5 gap-y-0.5 rounded-full px-1 py-2 text-[9px] font-semibold leading-tight transition active:scale-[0.98] sm:gap-2 sm:px-2 sm:py-2.5 sm:text-sm ${isActive ? 'bg-primary text-white shadow-md ring-2 ring-primary/25 hover:bg-primary-dark hover:text-white' : 'bg-transparent text-gray-800 hover:bg-white/90 hover:text-primary-dark'}`}
                >
                  <Icon size={14} className="shrink-0 sm:h-4 sm:w-4" />
                  <span className="max-w-full text-center leading-tight sm:max-w-[8rem] sm:truncate">{tab.label}</span>
                  {badge !== null ? (
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums sm:text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-700'}`}>
                      {badge}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <div className="mt-10 w-full min-w-0">
        {activeTab === 'posts' && (
          <div>
            {activeItems.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 text-center shadow-sm">
                <p className="text-lg font-semibold text-gray-700">ยังไม่มีโพสต์ที่แสดงอยู่</p>
                <p className="mt-2 text-sm text-gray-500">ลองโพสต์สินค้าเพื่อแสดงรายการในหน้าโปรไฟล์ของคุณ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activeItems.map((item) => {
                  const views = getItemViews(item.id)
                  const isActive = item.status === 'active'
                  const canEdit = canEditItem(item)

                  return (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md hover:border-gray-300"
                    >
                      {/* Image with Status Badge */}
                      <div className="relative h-48 w-full overflow-hidden">
                        {itemCoverUrl(item) ? (
                          <img
                            src={itemCoverUrl(item)}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100">
                            <ImageIcon size={48} className="text-gray-400" />
                          </div>
                        )}
                        {isActive && (
                          <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-md">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="mb-2 flex items-start justify-between">
                          <h3 className="flex-1 text-lg font-semibold text-gray-900">{item.title}</h3>
                        </div>

                        {/* Category Tag */}
                        <div className="mb-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-gray-700">
                            {item.category}
                          </span>
                        </div>

                        {/* Views Count */}
                        <div className="mb-4 flex items-center gap-1 text-sm text-gray-500">
                          <Eye size={16} className="text-gray-400" />
                          <span>{views} views</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleManageItem(item)}
                            disabled={!canEdit}
                            className="flex-1 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canEdit ? 'Cannot edit because there is an accepted exchange request' : ''}
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => handleEditItem(item)}
                            disabled={!canEdit}
                            className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canEdit ? 'Cannot edit because there is an accepted exchange request' : ''}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            disabled={!canEdit}
                            className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canEdit ? 'Cannot delete because there is an accepted exchange request' : 'Delete this post'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {activeTab === 'expired' && (
          <div>
            <div className="mb-6 rounded-2xl bg-yellow-50 border border-yellow-200 p-6">
              <div className="flex items-start gap-3">
                <Clock3 size={24} className="text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">โพสต์หมดอายุ</h3>
                  <p className="text-sm text-yellow-800">
                    โพสต์เหล่านี้หมดอายุแล้วและยังไม่ได้แลกเปลี่ยน คุณสามารถลบหรือแก้ไขได้
                  </p>
                </div>
              </div>
            </div>
            {expiredItems.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 text-center shadow-sm">
                <Clock3 size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-semibold text-gray-700">ยังไม่มีโพสต์หมดอายุ</p>
                <p className="mt-2 text-sm text-gray-500">โพสต์หมดอายุจะแสดงที่นี่</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {expiredItems.map((item) => {
                  const views = getItemViews(item.id)
                  const canEdit = canEditItem(item)
                  const expiredDate = item.available_until ? new Date(item.available_until).toLocaleDateString('th-TH') : 'ไม่ได้ระบุ'

                  return (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-2xl border-2 border-yellow-200 bg-white shadow-sm transition hover:shadow-md opacity-90"
                    >
                      {/* Image with หมดอายุ Badge */}
                      <div className="relative h-48 w-full overflow-hidden">
                        {itemCoverUrl(item) ? (
                          <img
                            src={itemCoverUrl(item)}
                            alt={item.title}
                            className="h-full w-full object-cover grayscale-[30%]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100">
                            <ImageIcon size={48} className="text-gray-400" />
                          </div>
                        )}
                        <span className="absolute right-3 top-3 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
                          หมดอายุ
                        </span>
                        <div className="absolute left-3 top-3 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                          <Clock3 size={12} className="inline mr-1" />
                          หมดอายุ: {expiredDate}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="mb-2 flex items-start justify-between">
                          <h3 className="flex-1 text-lg font-semibold text-gray-900">{item.title}</h3>
                        </div>

                        {/* Category Tag */}
                        <div className="mb-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            {item.category}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="mb-4 space-y-2 text-sm text-gray-600">
                          <p className="text-xs text-gray-500">Not exchanged</p>
                          <div className="flex items-center gap-1">
                            <Eye size={16} className="text-gray-400" />
                            <span>{views} views</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleManageItem(item)}
                            disabled={!canEdit}
                            className="flex-1 rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-800 transition hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canEdit ? 'Cannot edit because there is an accepted exchange request' : ''}
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => handleEditItem(item)}
                            disabled={!canEdit}
                            className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canEdit ? 'Cannot edit because there is an accepted exchange request' : ''}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            disabled={!canEdit}
                            className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canEdit ? 'Cannot delete because there is an accepted exchange request' : 'Delete this post'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {activeTab === 'history' && (
          <div>
            {exchangeHistory.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 text-center shadow-sm">
                <p className="text-lg font-semibold text-gray-700">ยังไม่มีประวัติการแลกเปลี่ยน</p>
                <p className="mt-2 text-sm text-gray-500">เมื่อแลกเปลี่ยนสำเร็จ รายการจะแสดงที่นี่</p>
              </div>
            ) : (
              <div className="space-y-6">
                {exchangeHistory.map((history) => {
                  const exchangeDate = new Date(history.exchanged_at)

                  return (
                    <div
                      key={history.id}
                      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                    >
                      {/* Date and CO2 Badge */}
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-600">
                          {exchangeDate.toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary-dark">
                          <CheckCircle size={16} className="text-primary" />
                          ประหยัด CO₂ {parseFloat(history.co2_reduced || 0).toFixed(1)}kg
                        </span>
                      </div>

                      {/* Exchange Items Display */}
                      <div className="flex items-center gap-4">
                        {/* My Item (ของของฉัน) */}
                        <div className="flex-1">
                          <div className="text-center">
                            <div className="mb-2 inline-block rounded-lg bg-gray-50 p-2">
                              {history.my_item_image_url ? (
                                <img
                                  src={history.my_item_image_url}
                                  alt={history.my_item_title || 'สินค้าของฉัน'}
                                  className="h-32 w-32 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-200">
                                  <Package size={32} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <p className="mt-2 text-xs font-medium text-gray-500">ของของฉัน</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {history.my_item_title || history.item_title || 'Unknown Item'}
                            </p>
                            {history.my_item_category && (
                              <p className="mt-1 text-xs text-gray-500">{history.my_item_category}</p>
                            )}
                          </div>
                        </div>

                        {/* Exchange Arrow */}
                        <div className="flex flex-col items-center">
                          <ArrowRightLeft size={24} className="text-primary" />
                        </div>

                        {/* Received Item (ที่ได้รับ) */}
                        <div className="flex-1">
                          <div className="text-center">
                            <div className="mb-2 inline-block rounded-lg bg-gray-50 p-2">
                              {history.received_item_image_url ? (
                                <img
                                  src={history.received_item_image_url}
                                  alt={history.received_item_title || 'สินค้าที่ได้รับ'}
                                  className="h-32 w-32 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-200">
                                  <Package size={32} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <p className="mt-2 text-xs font-medium text-gray-500">ที่ได้รับ</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {history.received_item_title || 'Unknown Item'}
                            </p>
                            {history.received_item_category && (
                              <p className="mt-1 text-xs text-gray-500">{history.received_item_category}</p>
                            )}
                            {history.received_from_name && (
                              <p className="mt-1 text-xs text-gray-500">
                                จาก {history.received_from_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {activeTab === 'donations' && (
          <div>
            {donationHistory.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 text-center shadow-sm">
                <Heart size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-semibold text-gray-700">ยังไม่มีประวัติการบริจาค</p>
                <p className="mt-2 text-sm text-gray-500">เมื่อบริจาคสำเร็จ รายการจะแสดงที่นี่</p>
              </div>
            ) : (
              <div className="space-y-6">
                {donationHistory.map((donation) => {
                  const donationDate = new Date(donation.donated_at)

                  return (
                    <div
                      key={donation.id}
                      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                    >
                      {/* Date and CO2 Badge */}
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-600">
                          {donationDate.toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                          <Heart size={16} className="text-red-600" />
                          ประหยัด CO₂ {parseFloat(donation.co2_reduced || 0).toFixed(1)}kg
                        </span>
                      </div>

                      {/* Donation Item Display */}
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="text-center">
                            <div className="mb-2 inline-block rounded-lg bg-gray-50 p-2">
                              {donation.item_image_url ? (
                                <img
                                  src={donation.item_image_url}
                                  alt={donation.item_title || 'สินค้าที่บริจาค'}
                                  className="h-32 w-32 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-200">
                                  <Package size={32} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <p className="mt-2 text-xs font-medium text-gray-500">Donated Item</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {donation.item_title || 'Unknown Item'}
                            </p>
                            {donation.item_category && (
                              <p className="mt-1 text-xs text-gray-500">{donation.item_category}</p>
                            )}
                          </div>
                        </div>

                        {/* Donation Info */}
                        <div className="flex-1">
                          <div className="rounded-lg bg-red-50 p-4">
                            {donation.recipient_name && (
                              <div className="mb-2">
                                <p className="text-xs font-medium text-gray-500">Recipient</p>
                                <p className="text-sm font-semibold text-gray-900">{donation.recipient_name}</p>
                              </div>
                            )}
                            {donation.recipient_contact && (
                              <div className="mb-2">
                                <p className="text-xs font-medium text-gray-500">ข้อมูลติดต่อ</p>
                                <p className="text-sm text-gray-700">{donation.recipient_contact}</p>
                              </div>
                            )}
                            {donation.donation_location && (
                              <div className="mb-2">
                                <p className="text-xs font-medium text-gray-500">สถานที่รับของ</p>
                                <p className="text-sm text-gray-700">{donation.donation_location}</p>
                              </div>
                            )}
                            {donation.message && (
                              <div className="mt-2 border-t border-red-200 pt-2">
                                <p className="text-xs font-medium text-gray-500">ข้อความ</p>
                                <p className="text-sm text-gray-700">{donation.message}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      <EditItemModal
        open={showEditItemModal}
        onClose={() => {
          setShowEditItemModal(false)
          setSelectedItem(null)
        }}
        item={selectedItem}
        onSuccess={handleItemUpdate}
      />

      {/* Manage Item Modal */}
      <ManageItemModal
        open={showManageItemModal}
        onClose={() => {
          setShowManageItemModal(false)
          setSelectedItem(null)
        }}
        item={selectedItem}
        onUpdate={handleItemUpdate}
      />
      </div>
    </div>
  )
}
