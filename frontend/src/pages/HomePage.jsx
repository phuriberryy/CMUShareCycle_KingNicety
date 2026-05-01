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
} from 'lucide-react'
import { itemsApi, statisticsApi, API_BASE } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { io } from 'socket.io-client'

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
  const [loadingStats, setLoadingStats] = useState(false)
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

  const quickFilterOptions = [
    { value: 'All Categories', label: 'ทั้งหมด' },
    { value: 'Clothes & Fashion', label: 'เสื้อผ้า' },
    { value: 'Dorm Essentials', label: 'หอ' },
    { value: 'Books & Study', label: 'หนังสือ' },
    { value: 'Kitchen & Appliances', label: 'ครัว' },
  ]

  const conditionOptions = [
    { value: 'All Conditions', label: 'ทุกสภาพ' },
    { value: 'Like New', label: 'เหมือนใหม่' },
    { value: 'Good', label: 'ดี' },
    { value: 'Fair', label: 'พอใช้' },
  ]

  const benefitCards = [
    { title: 'แลกอย่างยุติธรรม', description: 'แลกของให้คุ้มค่า', icon: Handshake, tone: 'blue' },
    { title: 'ลดขยะ', description: 'ใช้ซ้ำให้คุ้ม', icon: Recycle, tone: 'emerald' },
    { title: 'ชุมชน มช.', description: 'พบเพื่อนต่างคณะ', icon: Users, tone: 'purple' },
    { title: 'ประหยัด', description: 'ไม่ต้องซื้อใหม่', icon: PiggyBank, tone: 'amber' },
  ]
  const benefitToneClasses = {
    blue: 'border-blue-200/80 bg-gradient-to-br from-blue-50/90 to-white text-blue-600 [&_.benefit-desc]:text-gray-500',
    emerald: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white text-emerald-600 [&_.benefit-desc]:text-gray-500',
    purple: 'border-purple-200/80 bg-gradient-to-br from-purple-50/90 to-white text-purple-600 [&_.benefit-desc]:text-gray-500',
    amber: 'border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white text-amber-600 [&_.benefit-desc]:text-gray-500',
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

  useEffect(() => {
    setLoadingStats(true)
    statisticsApi
      .getStatistics()
      .then((data) => {
        setStatistics(data)
      })
      .catch((err) => {
        console.error('Failed to load statistics:', err)
      })
      .finally(() => setLoadingStats(false))
  }, [])

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

  const activeFilterCount = [
    selectedCategory !== 'All Categories',
    selectedCondition !== 'All Conditions',
  ].filter(Boolean).length

  return (
    <div className="sc-page overflow-x-hidden">
      <div className="sc-container space-y-6 sm:space-y-8">
        <section className="sc-card overflow-hidden border-primary/15 bg-gradient-to-br from-primary/8 via-white to-primary/5 shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 sm:py-8 lg:flex-row lg:items-center lg:justify-between lg:gap-14 lg:px-10 lg:py-10">
            <div className="max-w-xl space-y-2 sm:space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/90 px-3 py-1.5 text-xs font-semibold tracking-wide text-primary shadow-sm backdrop-blur-sm">
                <Leaf size={14} strokeWidth={2.5} />
                CMU ShareCycle
              </p>
              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
                  Swap what you have. Get what you need.
                </h1>
                <p className="max-w-lg text-sm text-gray-600 sm:text-base lg:text-lg">
                  Free exchange & donation.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={() => document.getElementById('items-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="sc-btn-primary min-h-11 px-5 py-3"
                >
                  Browse
                  <ArrowRight size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((prev) => !prev)}
                  className="sc-btn-secondary min-h-11 px-4 sm:hidden"
                  aria-expanded={filtersOpen}
                >
                  <SlidersHorizontal size={16} />
                  Filters
                  {activeFilterCount > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{activeFilterCount}</span>}
                </button>
                <span className="hidden min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm sm:inline-flex">
                  <Zap size={16} className="text-primary" />
                  <span>Zero waste campus</span>
                </span>
              </div>
            </div>
            <div className="hidden grid-cols-2 gap-3 sm:grid lg:max-w-sm">
              {benefitCards.map((benefit) => (
                <div key={benefit.title} className={`flex items-center gap-3 rounded-xl border p-3 shadow-sm backdrop-blur-sm transition hover:shadow-md sm:p-4 ${benefitToneClasses[benefit.tone]}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm [color:inherit]"><benefit.icon size={20} strokeWidth={2} /></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{benefit.title}</p>
                    <p className="benefit-desc text-xs">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {loadingStats ? (
          <section>
            <div className="sc-card sc-card-pad text-center text-sm text-gray-500">Loading statistics...</div>
          </section>
        ) : statistics ? (
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Community impact</h2>
            </div>
            <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:overflow-visible sm:px-0">
              <div className="grid min-w-[720px] grid-cols-6 gap-3 sm:min-w-0 sm:grid-cols-3 sm:gap-4">
                <div className="rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500">Users</span><Users size={18} className="text-blue-500" /></div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-blue-600">{statistics.totalUsers.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-gray-500">สมาชิก</p>
                </div>
                <div className="rounded-xl border border-green-200/60 bg-gradient-to-br from-green-50/80 to-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500">รายการสินค้า</span><Package size={18} className="text-green-500" /></div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-green-600">{statistics.totalItems.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{statistics.activeItems} พร้อมแลก</p>
                </div>
                <div className="rounded-xl border border-purple-200/60 bg-gradient-to-br from-purple-50/80 to-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500">การแลกเปลี่ยน</span><CheckCircle size={18} className="text-purple-500" /></div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-purple-600">{statistics.totalExchanges.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-gray-500">สำเร็จ</p>
                </div>
                <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500">CO₂ ลดได้</span><Leaf size={18} className="text-emerald-500" /></div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-emerald-600">{statistics.totalCO2Reduced.toLocaleString()} kg</p>
                  <p className="mt-0.5 text-xs text-gray-500">ลดได้</p>
                </div>
                <div className="rounded-xl border border-orange-200/60 bg-gradient-to-br from-orange-50/80 to-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500">คำขอ</span><RefreshCcw size={18} className="text-orange-500" /></div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-orange-600">{statistics.totalRequests.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{statistics.pendingRequests} รอ</p>
                </div>
                <div className="rounded-xl border border-teal-200/60 bg-gradient-to-br from-teal-50/80 to-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between"><span className="text-xs font-medium text-gray-500">อัตราแลกเปลี่ยน</span><Zap size={18} className="text-teal-500" /></div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-teal-600">{statistics.totalExchanges > 0 ? ((statistics.totalExchanges / statistics.totalUsers) * 100).toFixed(1) : '0'}%</p>
                  <p className="mt-0.5 text-xs text-gray-500">อัตราแลกเปลี่ยน</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section id="items-section" className="space-y-4 pb-safe">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">รายการสินค้า</h2>
            <p className="text-sm text-gray-500">ค้นหาและกรองรายการได้อย่างรวดเร็ว</p>
          </div>

          <div className="sticky top-[72px] z-20 -mx-4 border-y border-gray-200 bg-[#FAFBF9]/95 px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:space-y-4 sm:p-4">
              <label className="sr-only" htmlFor="search-items">ค้นหาสินค้า</label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="search-items"
                  type="text"
                  placeholder="Search items"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sc-input bg-gray-50 py-3 pl-10 pr-4"
                />
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide sm:hidden">
                {quickFilterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedCategory(opt.value)}
                    className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${selectedCategory === opt.value ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 sm:hidden">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((prev) => !prev)}
                  className="sc-btn-secondary min-h-11 flex-1 px-4"
                  aria-expanded={filtersOpen}
                >
                  <SlidersHorizontal size={16} />
                  Filters
                  {activeFilterCount > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{activeFilterCount}</span>}
                </button>
                <button
                  type="button"
                  onClick={onPostItem}
                  className="sc-btn-primary min-h-11 flex-1 px-4"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  Post
                </button>
              </div>
              <div className={`${filtersOpen ? 'block' : 'hidden'} space-y-3 sm:block`}>
                <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-center">
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
                  <button onClick={onPostItem} className="sc-btn-primary min-h-11 w-full sm:w-auto">
                    <Plus size={18} strokeWidth={2.5} />
                    โพสต์สินค้า
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="sc-card sc-card-pad text-center">
              <p className="text-sm font-medium text-gray-600">กำลังโหลดรายการ...</p>
              <p className="mt-1 text-xs text-gray-400">ถ้านานเกิน 15 วินาที อาจเป็นเพราะ backend (port 4000) ยังไม่รัน</p>
            </div>
          )}
          {!loading && loadError && (
            <div className="sc-card sc-card-pad text-center">
              <p className="text-base font-medium text-gray-700">โหลดรายการไม่สำเร็จ</p>
              <p className="mt-1 text-sm text-gray-500">ตรวจสอบว่า backend รันที่ port 4000 หรือลองรีเฟรช</p>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {filteredItems.map((item) => {
                const isInProgress = item.status === 'in_progress'
                const isDonated = item.status === 'donated'
                let daysLabel = null
                if (item.available_until) {
                  const today = new Date(); today.setHours(0, 0, 0, 0)
                  const expiry = new Date(item.available_until); expiry.setHours(0, 0, 0, 0)
                  const diffDays = Math.ceil((expiry - today) / 864e5)
                  if (diffDays < 0) daysLabel = { text: 'หมดอายุ', style: 'bg-red-100 text-red-700' }
                  else if (diffDays === 0) daysLabel = { text: 'หมดอายุวันนี้', style: 'bg-amber-100 text-amber-800' }
                  else if (diffDays <= 7) daysLabel = { text: `เหลือ ${diffDays} วัน`, style: 'bg-amber-100 text-amber-800' }
                }
                const primaryActionLabel = isInProgress ? 'กำลังดำเนินการ' : isDonated ? 'บริจาคแล้ว' : item.listing_type === 'donation' ? 'ขอรับบริจาค' : 'ขอแลกเปลี่ยน'

                return (
                  <article key={item.id} className={`group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition ${isInProgress ? 'opacity-70 cursor-not-allowed' : 'hover:border-gray-300 hover:shadow-md'}`}>
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 sm:aspect-[5/4]">
                      <img src={item.image_url || 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80'} alt={item.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
                        {daysLabel && <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${daysLabel.style}`}><Clock3 size={12} />{daysLabel.text}</span>}
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold text-white ${isInProgress ? 'bg-amber-500' : item.listing_type === 'donation' ? 'bg-rose-500' : 'bg-primary'}`}>{isInProgress ? 'กำลังดำเนินการ' : item.listing_type === 'donation' ? 'บริจาค' : 'แลกเปลี่ยน'}</span>
                      </div>
                    </div>
                    <div className="space-y-2.5 p-4">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-xs font-medium text-primary">{item.category}</span>
                          <button type="button" className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 sm:hidden" onClick={() => navigate(`/items/${item.id}`)} aria-label="Open item details">
                            <Eye size={15} />
                          </button>
                        </div>
                        <h3 onClick={() => navigate(`/items/${item.id}`)} className="cursor-pointer text-base font-semibold leading-snug text-gray-900 line-clamp-2 transition hover:text-primary">{item.title}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 sm:hidden">
                        <span className="rounded-full bg-gray-100 px-2 py-1">{item.item_condition}</span>
                        {item.pickup_location && <span className="rounded-full bg-gray-100 px-2 py-1">{item.pickup_location}</span>}
                      </div>
                      <div className="hidden flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 sm:flex">
                        <span>{item.item_condition}</span>
                        {item.pickup_location && (<span className="flex items-center gap-1 truncate"><MapPin size={12} />{item.pickup_location}</span>)}
                        <span className="flex items-center gap-1 truncate"><UserIcon size={12} />{item.owner_name || 'CMU Student'}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <button onClick={() => navigate(`/items/${item.id}`)} className="sc-btn-primary min-h-11 w-full px-3 text-xs sm:hidden">
                          {item.status === 'active' && item.listing_type === 'donation' ? <Heart size={16} /> : item.status === 'active' && item.listing_type !== 'donation' ? <RefreshCcw size={16} /> : <Eye size={16} />}
                          {item.status === 'active' && item.listing_type === 'donation' ? 'ขอรับบริจาค' : item.status === 'active' && item.listing_type !== 'donation' ? 'ขอแลกเปลี่ยน' : 'ดูรายละเอียด'}
                        </button>
                        <button onClick={() => navigate(`/items/${item.id}`)} className="sc-btn-secondary hidden min-h-11 w-full px-3 text-xs sm:flex sm:text-sm"><Eye size={16} />View details</button>
                        {item.status === 'active' && item.listing_type === 'donation' ? (
                          <button onClick={() => onDonationItem(item.id)} className="hidden sc-btn-primary min-h-11 w-full bg-rose-500 px-3 text-xs sm:flex sm:text-sm hover:bg-rose-600"><Heart size={16} />ขอรับบริจาค</button>
                        ) : item.status === 'active' && item.listing_type !== 'donation' ? (
                          <button onClick={() => onExchangeItem(item.id)} className="hidden sc-btn-primary min-h-11 w-full px-3 text-xs sm:flex sm:text-sm"><RefreshCcw size={16} />ขอแลกเปลี่ยน</button>
                        ) : (
                          <div className="hidden sc-btn-secondary min-h-11 w-full cursor-default px-3 text-xs text-gray-500 sm:flex sm:text-sm">{primaryActionLabel}</div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

