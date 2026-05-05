import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  ArrowRight,
  Leaf,
  Zap,
  Users,
  Package,
  CheckCircle,
  RefreshCcw,
} from 'lucide-react'
import { itemsApi, statisticsApi, API_BASE } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { io } from 'socket.io-client'
import ItemsStateSection from '../features/home/components/ItemsStateSection'
import HomeFiltersPanel from '../features/home/components/HomeFiltersPanel'
import ItemCardGrid from '../features/home/components/ItemCardGrid'
import {
  HOME_BENEFIT_CARDS,
  HOME_BENEFIT_TONE_CLASSES,
  HOME_CATEGORY_OPTIONS,
  HOME_CONDITION_OPTIONS,
} from '../features/home/constants/homeOptions'
import { filterHomeItems } from '../features/home/services/itemFeed'

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
  const categoryOptions = HOME_CATEGORY_OPTIONS
  const conditionOptions = HOME_CONDITION_OPTIONS
  const benefitCards = HOME_BENEFIT_CARDS
  const benefitToneClasses = HOME_BENEFIT_TONE_CLASSES

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
    return filterHomeItems(items, { searchQuery, selectedCategory, selectedCondition })
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

          <HomeFiltersPanel
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={() => fetchItems({ setItems, setLoading, setLoadError })}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((prev) => !prev)}
            onCloseFilters={() => setFiltersOpen(false)}
            categoryOptions={categoryOptions}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            conditionOptions={conditionOptions}
            selectedCondition={selectedCondition}
            onConditionChange={setSelectedCondition}
            onPostItem={onPostItem}
          />

          <ItemsStateSection
            loading={loading}
            loadError={loadError}
            hasItems={filteredItems.length > 0}
            onRetry={() => fetchItems({ setItems, setLoading, setLoadError })}
          />

          {!loading && !loadError && filteredItems.length > 0 ? (
            <ItemCardGrid
              items={filteredItems}
              navigate={navigate}
              onExchangeItem={onExchangeItem}
              onDonationItem={onDonationItem}
            />
          ) : null}
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

