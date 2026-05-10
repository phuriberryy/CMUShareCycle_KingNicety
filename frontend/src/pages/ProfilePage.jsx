import { useMemo, useState, useEffect, useRef } from 'react'
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
import { getCategoryLabel } from '../utils/itemLabels'
import ManageItemModal from '../components/modals/ManageItemModal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import TabBar from '../components/ui/TabBar'

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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletingItem, setDeletingItem] = useState(false)
  const { user, token } = useAuth()
  const toast = useToast()

  const activeTabRef = useRef(activeTab)
  useEffect(() => { activeTabRef.current = activeTab }, [activeTab])

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
      reconnectionAttempts: 5,
      timeout: 20000,
      transports: ['polling', 'websocket'],
      upgrade: true,
    })

    socket.on('connect_error', (err) => {
      if (err.message !== 'websocket error' && err.message !== 'xhr poll error') {
        console.debug('Socket connection error:', err.message)
      }
    })

    socket.on('item:updated', () => {
      const tab = activeTabRef.current
      if (tab === 'posts' || tab === 'expired') {
        fetchMyItems({ token, activeTab: tab, setMyItems })
      }
    })

    socket.on('item:deleted', () => {
      const tab = activeTabRef.current
      if (tab === 'posts' || tab === 'expired') {
        fetchMyItems({ token, activeTab: tab, setMyItems })
      }
    })

    socket.on('exchange:completed', () => {
      const tab = activeTabRef.current
      if (tab === 'history') {
        profileApi.getExchangeHistory(token)
          .then(setExchangeHistory)
          .catch((err) => console.error('Failed to refresh exchange history:', err))
      }
      if (tab === 'posts' || tab === 'expired') {
        fetchMyItems({ token, activeTab: tab, setMyItems })
      }
    })

    socket.on('donation:completed', () => {
      const tab = activeTabRef.current
      if (tab === 'donations') {
        donationApi.getMyDonations(token)
          .then(setDonationHistory)
          .catch((err) => console.error('Failed to refresh donation history:', err))
      }
      if (tab === 'posts' || tab === 'expired') {
        fetchMyItems({ token, activeTab: tab, setMyItems })
      }
    })

    socket.on('notification:new', () => {
      if (activeTabRef.current === 'posts') {
        exchangeApi.getMyRequests(token)
          .then(setExchangeRequests)
          .catch((err) => console.error('Failed to refresh exchange requests:', err))
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [token])

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

  const handleDeleteItem = (item) => {
    if (!token) return
    setDeleteTarget(item)
  }

  const confirmDeleteItem = async () => {
    if (!token || !deleteTarget) return
    setDeletingItem(true)
    try {
      await itemsApi.delete(token, deleteTarget.id)
      toast.success('ลบโพสต์สำเร็จ!', 'สำเร็จ')
      if (activeTab === 'posts' || activeTab === 'expired') {
        const data = await profileApi.getMyItems(token)
        setMyItems(data)
      }
      setDeleteTarget(null)
    } catch (err) {
      console.error('Failed to delete item:', err)
      toast.error(err.message || 'ไม่สามารถลบโพสต์ได้', 'เกิดข้อผิดพลาด')
    } finally {
      setDeletingItem(false)
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
    if (!user?.name) return 'มช'
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
    { key: 'shared', label: 'สิ่งของ', value: stats.itemsShared || 0, icon: Package, tone: 'green' },
    { key: 'co2', label: 'CO₂ (กก.)', value: parseFloat(stats.co2Reduced || 0).toFixed(2), icon: CheckCircle, tone: 'emerald' },
    { key: 'exchanges', label: 'แลกเปลี่ยน', value: stats.totalExchanges || 0, icon: ArrowRightLeft, tone: 'purple' },
    { key: 'donations', label: 'บริจาค', value: stats.totalDonations || 0, icon: Heart, tone: 'rose' },
  ]

  return (
    <div className="min-h-screen w-full min-w-0 bg-surface">
      <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">

      {/* Profile Header + Stats */}
      <section className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated ring-1 ring-black/[0.03]">
        <div className="px-4 pb-0 pt-6 sm:px-8 sm:pt-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary-light bg-primary text-2xl font-bold text-white shadow-md sm:h-28 sm:w-28 sm:text-3xl">
            {initials}
          </div>
          <div className="mt-5">
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

        {/* Stats Strip */}
        <div className="mt-5 border-t border-gray-100">
          <div className="grid grid-cols-5 divide-x divide-gray-100">
            {statCards.map((stat) => {
              const iconColor =
                stat.tone === 'purple'  ? 'text-purple-500'
                : stat.tone === 'rose'  ? 'text-rose-400'
                : stat.tone === 'emerald' ? 'text-emerald-500'
                : 'text-primary'
              return (
                <div key={stat.key} className="flex flex-col items-center gap-1 px-1 py-3 sm:px-3 sm:py-4">
                  <stat.icon size={13} strokeWidth={2} className={`shrink-0 ${iconColor}`} aria-hidden="true" />
                  <p className="text-sm font-bold tabular-nums leading-none text-gray-900 sm:text-lg">{stat.value}</p>
                  <p className="text-[9px] font-medium leading-none text-gray-400 sm:text-[11px]">{stat.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Tab Bar */}
      <div className="mt-3 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card ring-1 ring-black/[0.03]">
        <TabBar tabs={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="mt-6 w-full min-w-0">
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
                            กำลังโพสต์
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
                            {getCategoryLabel(item.category, item.other_subtype)}
                          </span>
                        </div>

                        {/* Views Count */}
                        <div className="mb-4 flex items-center gap-1 text-sm text-gray-500">
                          <Eye size={16} className="text-gray-400" />
                          <span>{views} คำขอ</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleManageItem(item)}
                            disabled={!canEdit}
                            className="flex-1 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canEdit ? 'ไม่สามารถแก้ไขได้เพราะมีคำขอที่ตอบรับแล้ว' : ''}
                          >
                            จัดการ
                          </button>
                          <button
                            onClick={() => handleEditItem(item)}
                            disabled={!canEdit}
                            className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canEdit ? 'ไม่สามารถแก้ไขได้เพราะมีคำขอที่ตอบรับแล้ว' : ''}
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            disabled={!canEdit}
                            className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canEdit ? 'ไม่สามารถลบได้เพราะมีคำขอที่ตอบรับแล้ว' : 'ลบโพสต์นี้'}
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
            <div className="mb-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 sm:mb-6 sm:p-6">
              <div className="flex items-start gap-3">
                <Clock3 size={20} className="mt-0.5 flex-shrink-0 text-yellow-600 sm:mt-1 sm:h-6 sm:w-6" />
                <div>
                  <h3 className="mb-1 text-base font-semibold text-yellow-900 sm:mb-2 sm:text-lg">โพสต์หมดอายุ</h3>
                  <p className="text-xs leading-relaxed text-yellow-800 sm:text-sm">
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4 xl:grid-cols-5">
                {expiredItems.map((item) => {
                  const views = getItemViews(item.id)
                  const canEdit = canEditItem(item)
                  const expiredDate = item.available_until ? new Date(item.available_until).toLocaleDateString('th-TH') : 'ไม่ได้ระบุ'

                  return (
                    <div
                      key={item.id}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-yellow-200/80 bg-white shadow-sm transition hover:shadow-md"
                    >
                      {/* Image — compact aspect */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
                        {itemCoverUrl(item) ? (
                          <img
                            src={itemCoverUrl(item)}
                            alt={item.title}
                            className="h-full w-full object-cover grayscale-[20%]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon size={28} className="text-gray-400" />
                          </div>
                        )}
                        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-red-500/95 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">
                          <Clock3 size={10} className="shrink-0" />
                          หมดอายุ {expiredDate}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-2.5">
                        <h3 className="line-clamp-1 text-[13px] font-semibold leading-tight text-gray-900">
                          {item.title}
                        </h3>

                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          <span className="truncate rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                            {getCategoryLabel(item.category, item.other_subtype)}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
                            <Eye size={11} className="text-gray-400" />
                            {views}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-auto flex gap-1 pt-2">
                          <button
                            onClick={() => handleManageItem(item)}
                            disabled={!canEdit}
                            className="flex-1 rounded-full bg-yellow-100 px-2 py-1 text-[11px] font-semibold text-yellow-800 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
                            title={!canEdit ? 'ไม่สามารถแก้ไขได้เพราะมีคำขอที่ตอบรับแล้ว' : 'จัดการคำขอ'}
                          >
                            จัดการ
                          </button>
                          <button
                            onClick={() => handleEditItem(item)}
                            disabled={!canEdit}
                            className="flex-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                            title={!canEdit ? 'ไม่สามารถแก้ไขได้เพราะมีคำขอที่ตอบรับแล้ว' : 'แก้ไขโพสต์'}
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            disabled={!canEdit}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                            title={!canEdit ? 'ไม่สามารถลบได้เพราะมีคำขอที่ตอบรับแล้ว' : 'ลบโพสต์นี้'}
                            aria-label="ลบโพสต์"
                          >
                            <Trash2 size={13} />
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
                          ประหยัด CO₂ {parseFloat(history.co2_reduced || 0).toFixed(1)} กก.
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
                              {history.my_item_title || history.item_title || 'ไม่ระบุชื่อ'}
                            </p>
                            {history.my_item_category && (
                              <p className="mt-1 text-xs text-gray-500">{getCategoryLabel(history.my_item_category, history.my_item_other_subtype)}</p>
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
                              {history.received_item_title || 'ไม่ระบุชื่อ'}
                            </p>
                            {history.received_item_category && (
                              <p className="mt-1 text-xs text-gray-500">{getCategoryLabel(history.received_item_category, history.received_item_other_subtype)}</p>
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
                          ประหยัด CO₂ {parseFloat(donation.co2_reduced || 0).toFixed(1)} กก.
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
                            <p className="mt-2 text-xs font-medium text-gray-500">สินค้าที่บริจาค</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {donation.item_title || 'ไม่ระบุชื่อ'}
                            </p>
                            {donation.item_category && (
                              <p className="mt-1 text-xs text-gray-500">{getCategoryLabel(donation.item_category, donation.item_other_subtype)}</p>
                            )}
                          </div>
                        </div>

                        {/* Donation Info */}
                        <div className="flex-1">
                          <div className="rounded-lg bg-red-50 p-4">
                            {donation.recipient_name && (
                              <div className="mb-2">
                                <p className="text-xs font-medium text-gray-500">ผู้รับบริจาค</p>
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        variant="danger"
        title="ยืนยันการลบโพสต์"
        description={
          deleteTarget ? (
            <span>
              ต้องการลบโพสต์ <span className="font-semibold text-gray-900">“{deleteTarget.title}”</span> ใช่หรือไม่?
              <br />
              <span className="text-gray-500">การลบไม่สามารถย้อนกลับได้</span>
            </span>
          ) : null
        }
        confirmLabel="ลบโพสต์"
        cancelLabel="ยกเลิก"
        loading={deletingItem}
        onConfirm={confirmDeleteItem}
        onCancel={() => {
          if (!deletingItem) setDeleteTarget(null)
        }}
      />
      </div>
    </div>
  )
}
