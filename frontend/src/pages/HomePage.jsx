import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Handshake,
  Recycle,
  Users,
  PiggyBank,
  Plus,
  ArrowRight,
  RefreshCcw,
  Leaf,
  Zap,
  Clock3,
  ChevronDown,
  MapPin,
  User as UserIcon,
  Package,
  CheckCircle,
  Eye,
  Heart,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { itemsApi, statisticsApi, API_BASE } from '../lib/api'
import { itemCoverUrl } from '../utils/itemImages'
import { useAuth } from '../context/AuthContext'
import { io } from 'socket.io-client'

function ownerInitials(name) {
  if (!name || typeof name !== 'string' || !name.trim()) return 'มช'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'มช'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  const a = parts[0][0] || ''
  const b = parts[parts.length - 1][0] || ''
  return `${a}${b}`.toUpperCase() || 'มช'
}

function formatExpiryShort(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  } catch {
    return null
  }
}

const fetchItems = ({ setItems, setLoading, setLoadError }) => {
  setLoading(true)
  if (setLoadError) setLoadError(false)
  itemsApi
    .list()
    .then((data) => {
      const list = Array.isArray(data) ? data : (data?.items && Array.isArray(data.items) ? data.items : [])
      setItems(list)
    })
    .catch(() => {
      setItems([])
      if (setLoadError) setLoadError(true)
    })
    .finally(() => setLoading(false))
}

export default function HomePage({ onExchangeItem, onDonationItem, onPostItem, refreshKey }) {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [selectedCondition, setSelectedCondition] = useState('All Conditions')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [statistics, setStatistics] = useState(null)
  const categoryOptions = [
    { value: 'All Categories', label: 'ทุกหมวดหมู่' },
    { value: 'Clothes & Fashion', label: '👕 เสื้อผ้า แฟชั่น' },
    { value: 'Dorm Essentials', label: '🏡 ของใช้ในหอ' },
    { value: 'Books & Study', label: '📚 หนังสือ การเรียน' },
    { value: 'Kitchen & Appliances', label: '🍳 ครัว เครื่องใช้' },
    { value: 'Cleaning & Laundry', label: '🧼 ทำความสะอาด ซักผ้า' },
    { value: 'Hobbies & Entertainment', label: '🎮 งานอดิเรก ความบันเทิง' },
    { value: 'Sports Gear', label: '🏀 กีฬา' },
    { value: 'Others', label: '✨ อื่นๆ' },
  ]

  const conditionOptions = [
    { value: 'All Conditions', label: 'ทุกสภาพ' },
    { value: 'Like New', label: 'เหมือนใหม่' },
    { value: 'Good', label: 'ดี' },
    { value: 'Fair', label: 'พอใช้' },
  ]

  const benefitCards = [
    { title: 'แลกอย่างยุติธรรม', description: 'แลกของให้คุ้มค่า', icon: Handshake, tone: 'blue' },
    { title: 'ลดขยะ', description: 'ใช้ซ้ำให้คุ้ม', icon: Recycle, tone: 'sage' },
    { title: 'ชุมชน มช.', description: 'พบเพื่อนต่างคณะ', icon: Users, tone: 'purple' },
    { title: 'ประหยัด', description: 'ไม่ต้องซื้อใหม่', icon: PiggyBank, tone: 'amber' },
  ]
  const benefitToneClasses = {
    blue: 'border-blue-100/80 bg-gradient-to-br from-blue-50/60 to-white text-blue-600 [&_.benefit-desc]:text-gray-500',
    sage: 'border-primary/10 bg-gradient-to-br from-primary-light/35 to-white text-primary [&_.benefit-desc]:text-gray-600',
    purple: 'border-purple-100/80 bg-gradient-to-br from-purple-50/50 to-white text-purple-600 [&_.benefit-desc]:text-gray-500',
    amber: 'border-amber-100/80 bg-gradient-to-br from-amber-50/50 to-white text-amber-600 [&_.benefit-desc]:text-gray-500',
  }

  useEffect(() => {
    fetchItems({ setItems, setLoading, setLoadError })
  }, [refreshKey])

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
      if (err.message !== 'websocket error' && err.message !== 'xhr poll error') {
        console.debug('Socket connection error:', err.message)
      }
    })

    socket.on('item:created', () => {
      fetchItems({ setItems, setLoading, setLoadError })
    })

    socket.on('item:updated', () => {
      fetchItems({ setItems, setLoading, setLoadError })
    })

    socket.on('item:deleted', () => {
      fetchItems({ setItems, setLoading, setLoadError })
    })

    socket.on('exchange:completed', () => {
      fetchItems({ setItems, setLoading, setLoadError })
      statisticsApi.getStatistics()
        .then(setStatistics)
        .catch((err) => console.error('Failed to refresh statistics:', err))
    })

    socket.on('donation:completed', () => {
      fetchItems({ setItems, setLoading, setLoadError })
      statisticsApi.getStatistics()
        .then(setStatistics)
        .catch((err) => console.error('Failed to refresh statistics:', err))
    })

    return () => {
      socket.disconnect()
    }
  }, [token])


  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const title = item.title || ''
      const description = item.description || ''
      const matchesQuery =
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory =
        selectedCategory === 'All Categories' || item.category === selectedCategory
      const matchesCondition =
        selectedCondition === 'All Conditions' || item.item_condition === selectedCondition
      return matchesQuery && matchesCategory && matchesCondition
    })
  }, [items, searchQuery, selectedCategory, selectedCondition])

  return (
    <div className="sc-page w-full min-w-0 overflow-x-hidden">
      <div className="sc-container w-full min-w-0 space-y-8 sm:space-y-10 lg:space-y-12">
        <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-surface-light to-primary-light/35 shadow-md shadow-primary/[0.07] ring-1 ring-primary/10 sm:rounded-2xl">
          <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary/[0.08] blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-44 w-44 rounded-full bg-primary/[0.06] blur-3xl" aria-hidden />

          <div className="relative z-10 flex flex-col gap-6 px-5 py-6 sm:gap-7 sm:px-7 sm:py-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-10 lg:py-9">
            <div className="max-w-xl space-y-4 sm:space-y-5">
              <div className="space-y-2 sm:space-y-2.5">
                <h1 className="text-balance text-xl font-bold leading-[1.55] tracking-[0.03em] text-primary-dark sm:text-3xl sm:leading-[1.5] sm:tracking-[0.04em] lg:text-[2rem] lg:leading-[1.48] [text-rendering:optimizeLegibility]">
                  ของที่มี แลกของที่ต้องการ
                </h1>
                <p className="max-w-lg text-sm font-normal leading-relaxed text-gray-700 sm:text-base">
                  แลกเปลี่ยนและบริจาคภายใน มช. — ปลอดภัย ไม่มีค่าใช้จ่าย
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <button
                  type="button"
                  onClick={() => document.getElementById('items-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="sc-btn-primary min-h-10 justify-center px-4 py-2.5 text-sm font-semibold sm:min-h-10 sm:px-5"
                >
                  ดูรายการ
                  <ArrowRight size={16} strokeWidth={2.5} className="shrink-0" />
                </button>
                <span className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50/80 sm:w-auto sm:justify-start sm:text-sm sm:py-2">
                  <Zap size={15} className="shrink-0 text-primary" aria-hidden />
                  <span className="text-center sm:text-left">มุ่งสู่มหาวิทยาลัยไร้ขยะ</span>
                </span>
              </div>
            </div>
            <div className="mt-1 grid w-full grid-cols-2 gap-3 sm:mt-0 sm:gap-3 lg:mt-0 lg:max-w-sm lg:shrink-0">
              {benefitCards.map((benefit) => (
                <div
                  key={benefit.title}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 transition duration-200 hover:border-gray-200/90 hover:shadow-sm sm:gap-3 sm:p-3.5 ${benefitToneClasses[benefit.tone]}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/[0.06] [color:inherit] sm:h-9 sm:w-9 sm:rounded-xl">
                    <benefit.icon className="h-4 w-4 sm:h-[17px] sm:w-[17px]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold leading-snug text-gray-900 sm:text-[13px]">{benefit.title}</p>
                    <p className="benefit-desc mt-0.5 text-[10px] leading-snug sm:text-[11px]">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {statistics ? (
          <section className="hidden sm:block">
            <div className="mb-4 sm:mb-5">
              <h2 className="text-lg font-bold text-gray-900 sm:text-xl">ผลกระทบต่อชุมชน</h2>
            </div>
            <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:overflow-visible sm:px-0">
              <div className="grid min-w-[720px] grid-cols-6 gap-2 sm:min-w-0 sm:grid-cols-3 sm:gap-3">
                <div className="rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-white p-3 shadow-elevated transition hover:shadow-elevated-hover sm:rounded-2xl sm:p-4">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500">ผู้ใช้ทั้งหมด</span><Users size={18} className="text-blue-500" /></div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-blue-600">{statistics.totalUsers.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-gray-500">บัญชีที่ลงทะเบียน</p>
                </div>
                <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary-light/80 to-white p-3 shadow-elevated transition hover:shadow-elevated-hover sm:rounded-2xl sm:p-4">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500">รายการสินค้า</span><Package size={18} className="text-primary" /></div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-primary">{statistics.totalItems.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{statistics.activeItems} พร้อมแลก</p>
                </div>
                <div className="rounded-xl border border-purple-200/60 bg-gradient-to-br from-purple-50/80 to-white p-3 shadow-elevated transition hover:shadow-elevated-hover sm:rounded-2xl sm:p-4">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500">การแลกเปลี่ยน</span><CheckCircle size={18} className="text-purple-500" /></div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-purple-600">{statistics.totalExchanges.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-gray-500">สำเร็จ</p>
                </div>
                <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary-light/80 to-white p-3 shadow-elevated transition hover:shadow-elevated-hover sm:rounded-2xl sm:p-4">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500">CO₂ ลดได้</span><Leaf size={18} className="text-primary" /></div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-primary">{statistics.totalCO2Reduced.toLocaleString()} kg</p>
                  <p className="mt-0.5 text-xs text-gray-500">ลดได้</p>
                </div>
                <div className="rounded-xl border border-orange-200/60 bg-gradient-to-br from-orange-50/80 to-white p-3 shadow-elevated transition hover:shadow-elevated-hover sm:rounded-2xl sm:p-4">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500">คำขอ</span><RefreshCcw size={18} className="text-orange-500" /></div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-orange-600">{statistics.totalRequests.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{statistics.pendingRequests} รอ</p>
                </div>
                <div className="rounded-xl border border-teal-200/60 bg-gradient-to-br from-teal-50/80 to-white p-3 shadow-elevated transition hover:shadow-elevated-hover sm:rounded-2xl sm:p-4">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500">อัตราแลกเปลี่ยน</span><Zap size={18} className="text-teal-500" /></div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-teal-600">{statistics.totalExchanges > 0 ? ((statistics.totalExchanges / statistics.totalUsers) * 100).toFixed(1) : '0'}%</p>
                  <p className="mt-0.5 text-xs text-gray-500">อัตราแลกเปลี่ยน</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section
          id="items-section"
          className="space-y-6 pb-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] sm:space-y-7 sm:pb-8"
        >
          <div className="space-y-2 sm:space-y-2.5">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">รายการสินค้า</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-gray-500">พิมพ์ค้นหาชื่อหรือรายละเอียด เลือกหมวดกับสภาพของ แล้วแตะรายการด้านล่างเพื่อแลกหรือบริจาค</p>
          </div>

          <div className="sticky top-[60px] z-20 py-1 sm:static sm:py-0">
            <div className="space-y-3.5 rounded-2xl border border-gray-100/90 bg-white p-4 shadow-sm ring-1 ring-gray-100/60 sm:space-y-4 sm:rounded-2xl sm:p-5">
              <label className="sr-only" htmlFor="search-items">ค้นหาสินค้า</label>
              <div className="flex items-center gap-2 sm:grid sm:grid-cols-[1.4fr_auto] sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="search-items"
                    type="text"
                    placeholder="ค้นหาชื่อหรือรายละเอียดสินค้า…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="sc-input h-10 border-gray-100 bg-gray-50/90 py-2 pl-9 pr-3 text-sm transition focus:bg-white"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fetchItems({ setItems, setLoading, setLoadError })}
                    disabled={loading}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-600 shadow-sm transition hover:border-primary/20 hover:bg-primary-light/40 hover:text-primary disabled:opacity-50"
                    aria-label="โหลดรายการใหม่"
                  >
                    <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((prev) => !prev)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-700 shadow-sm transition hover:border-primary/20 hover:bg-primary-light/30 active:scale-95 sm:hidden"
                    aria-label="กรองหมวดและสภาพ"
                    aria-expanded={filtersOpen}
                  >
                    <SlidersHorizontal size={18} />
                  </button>
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="grid gap-3.5 sm:grid-cols-[1.4fr_1fr_auto] sm:items-center sm:gap-4">
                  <div className="relative">
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="sc-select pr-9">
                      {categoryOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                  <div className="relative">
                    <select value={selectedCondition} onChange={(e) => setSelectedCondition(e.target.value)} className="sc-select pr-9">
                      {conditionOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                  <button onClick={onPostItem} className="sc-btn-primary min-h-10 w-full sm:w-auto">
                    <Plus size={18} strokeWidth={2.5} />
                    โพสต์สินค้า
                  </button>
                </div>
              </div>
              {filtersOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 pb-0 sm:hidden"
                  onClick={() => setFiltersOpen(false)}
                >
                  <div
                    className="max-h-[min(88vh,640px)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-4 shadow-2xl ring-1 ring-gray-200/80"
                    style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-200" aria-hidden />
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-gray-900">กรองรายการ</p>
                        <p className="text-sm text-gray-500">เลือกหมวดกับสภาพของให้ตรงที่ต้องการ</p>
                      </div>
                      <button type="button" onClick={() => setFiltersOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200" aria-label="ปิด">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="sc-select h-11 pr-9 text-sm">
                            {categoryOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                        <div className="relative">
                          <select value={selectedCondition} onChange={(e) => setSelectedCondition(e.target.value)} className="sc-select h-11 pr-9 text-sm">
                            {conditionOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                      </div>
                      <button onClick={() => setFiltersOpen(false)} className="sc-btn-primary min-h-11 w-full">
                        เสร็จแล้ว
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {loading && (
            <div className="sc-card sc-card-pad text-center">
              <p className="text-sm font-medium text-gray-600">กำลังโหลดรายการ...</p>
              <p className="mt-1 text-xs text-gray-400">ถ้ารอนานผิดปกติ ลองกดปุ่มโหลดใหม่ด้านบน หรือรีโหลดหน้านี้</p>
            </div>
          )}
          {!loading && loadError && (
            <div className="sc-card sc-card-pad text-center">
              <p className="text-base font-medium text-gray-700">โหลดรายการไม่สำเร็จ</p>
              <p className="mt-1 text-sm text-gray-500">เชื่อมต่อไม่สำเร็จชั่วคราว ลองกด «โหลดใหม่» หรือรีโหลดหน้า — ถ้ายังไม่ได้ รอสักครู่แล้วลองอีกครั้ง</p>
              <button
                type="button"
                onClick={() => fetchItems({ setItems, setLoading, setLoadError })}
                className="mt-5 sc-btn-primary"
              >
                ลองโหลดใหม่
              </button>
            </div>
          )}
          {!loading && !loadError && filteredItems.length === 0 && (
            <div className="sc-card sc-card-pad text-center">
              <p className="text-base font-medium text-gray-700">ยังไม่มีสินค้าในตอนนี้</p>
              <p className="mt-1 text-sm text-gray-500">เริ่มต้นโดยการโพสต์สินค้าชิ้นแรก</p>
            </div>
          )}

          {!loading && !loadError && filteredItems.length > 0 && (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => {
                const isInProgress = item.status === 'in_progress'
                const isDonated = item.status === 'donated'
                let daysLabel = null
                if (item.available_until) {
                  const today = new Date(); today.setHours(0, 0, 0, 0)
                  const expiry = new Date(item.available_until); expiry.setHours(0, 0, 0, 0)
                  const diffDays = Math.ceil((expiry - today) / 864e5)
                  if (diffDays < 0) daysLabel = { text: 'หมดอายุ', style: 'bg-red-50 text-red-700 ring-1 ring-red-100' }
                  else if (diffDays === 0) daysLabel = { text: 'วันนี้หมดอายุ', style: 'bg-amber-50 text-amber-900 ring-1 ring-amber-100' }
                  else if (diffDays <= 7) daysLabel = { text: `เหลือ ${diffDays} วัน`, style: 'bg-amber-50 text-amber-900 ring-1 ring-amber-100' }
                }
                const primaryActionLabel = isInProgress ? 'กำลังดำเนินการ' : isDonated ? 'บริจาคแล้ว' : item.listing_type === 'donation' ? 'ขอรับบริจาค' : 'ขอแลกเปลี่ยน'
                const mobileActionLabel = item.status === 'active' && item.listing_type === 'donation' ? 'ขอรับบริจาค' : item.status === 'active' && item.listing_type !== 'donation' ? 'ขอแลกเปลี่ยน' : 'ดูรายละเอียด'
                const expiryLine = formatExpiryShort(item.available_until)
                const owner = item.owner_name || 'นักศึกษา มช.'
                const faculty = item.owner_faculty || ''

                return (
                  <article
                    key={item.id}
                    className={`group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-100/90 bg-white shadow-elevated ring-1 ring-black/[0.03] transition duration-200 sm:rounded-3xl ${
                      isInProgress ? 'cursor-not-allowed opacity-75' : 'hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-elevated-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-[11px] font-bold tracking-tight text-primary-dark ring-2 ring-white shadow-sm sm:h-10 sm:w-10 sm:text-xs">
                        {ownerInitials(owner)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{owner}</p>
                        <p className="truncate text-xs text-gray-500">{faculty || 'มหาวิทยาลัยเชียงใหม่'}</p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-500 shadow-sm transition hover:border-primary/20 hover:text-primary sm:hidden"
                        onClick={() => navigate(`/items/${item.id}`)}
                        aria-label="เปิดรายละเอียดสินค้า"
                      >
                        <Eye size={16} />
                      </button>
                    </div>

                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                      <img
                        src={itemCoverUrl(item) || 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80'}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                        {daysLabel ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-[2px] ${daysLabel.style}`}>
                            <Clock3 size={12} className="shrink-0" />
                            {daysLabel.text}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-md ${
                            isInProgress ? 'bg-amber-500' : item.listing_type === 'donation' ? 'bg-rose-500' : 'bg-primary'
                          }`}
                        >
                          {isInProgress ? 'ดำเนินการ' : item.listing_type === 'donation' ? 'บริจาค' : 'แลกเปลี่ยน'}
                        </span>
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3 pt-2.5 sm:gap-3 sm:p-4 sm:pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex max-w-full truncate rounded-full bg-primary-light/70 px-2.5 py-0.5 text-[11px] font-semibold text-primary-dark ring-1 ring-primary/10">
                          #{item.category}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200/80">
                          {item.item_condition}
                        </span>
                      </div>

                      <h3
                        onClick={() => navigate(`/items/${item.id}`)}
                        className="line-clamp-2 shrink-0 cursor-pointer text-sm font-bold leading-snug tracking-tight text-gray-900 transition hover:text-primary sm:text-base"
                      >
                        {item.title}
                      </h3>

                      <div className="flex min-h-0 flex-1 flex-col space-y-1 border-t border-gray-50 pt-2 text-xs text-gray-500 sm:space-y-1.5 sm:pt-3">
                        <div className="min-h-0 space-y-1 sm:space-y-1.5">
                          {expiryLine && (
                            <p className="flex items-center gap-2 font-medium text-gray-600">
                              <Clock3 size={14} className="shrink-0 text-primary/70" />
                              <span>หมดอายุโพสต์ {expiryLine}</span>
                            </p>
                          )}
                          {item.pickup_location && (
                            <p className="flex items-start gap-2">
                              <MapPin size={14} className="mt-0.5 shrink-0 text-primary/70" />
                              <span className="line-clamp-2 leading-relaxed">{item.pickup_location}</span>
                            </p>
                          )}
                          <p className="hidden items-center gap-2 sm:flex">
                            <UserIcon size={14} className="shrink-0 text-primary/70" />
                            <span className="truncate font-medium text-gray-600">{owner}</span>
                          </p>
                        </div>
                        <div className="mt-auto grid shrink-0 grid-cols-1 gap-1.5 pt-2 sm:gap-2 sm:pt-2.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/items/${item.id}`)}
                          className="sc-btn-primary min-h-10 w-full rounded-xl px-3 text-sm font-semibold shadow-md sm:hidden"
                        >
                          {item.status === 'active' && item.listing_type === 'donation' ? <Heart size={18} /> : item.status === 'active' && item.listing_type !== 'donation' ? <RefreshCcw size={18} /> : <Eye size={18} />}
                          {mobileActionLabel}
                        </button>
                        {item.status === 'active' && item.listing_type === 'donation' ? (
                          <button
                            type="button"
                            onClick={() => onDonationItem(item.id)}
                            className="hidden min-h-10 w-full rounded-xl bg-rose-500 px-3 text-sm font-semibold text-white shadow-md transition hover:bg-rose-600 sm:inline-flex"
                          >
                            <Heart size={18} />
                            ขอรับบริจาค
                          </button>
                        ) : item.status === 'active' && item.listing_type !== 'donation' ? (
                          <button
                            type="button"
                            onClick={() => onExchangeItem(item.id)}
                            className="hidden min-h-10 w-full rounded-xl bg-primary px-3 text-sm font-semibold text-white shadow-md ring-1 ring-white/20 transition hover:bg-primary-dark sm:inline-flex"
                          >
                            <RefreshCcw size={18} />
                            ขอแลกเปลี่ยน
                          </button>
                        ) : (
                          <div className="hidden min-h-10 w-full cursor-default items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-500 sm:flex">
                            {primaryActionLabel}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/items/${item.id}`)}
                          className="sc-btn-secondary hidden min-h-10 w-full rounded-xl px-3 text-sm font-semibold sm:inline-flex"
                        >
                          <Eye size={18} />
                          ดูรายละเอียด
                        </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <button
        type="button"
        onClick={onPostItem}
        className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/30 bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-elevated-hover ring-2 ring-primary/20 transition active:scale-[0.98] sm:hidden"
        aria-label="โพสต์สินค้าใหม่"
      >
        <Plus size={22} strokeWidth={2.5} />
        โพสต์สินค้า
      </button>
    </div>
  )
}

