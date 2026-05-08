import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  User as UserIcon,
  Calendar,
  Package,
  Zap,
  Clock3,
  AlertCircle,
  Heart,
} from 'lucide-react'
import { itemsApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { calculateItemCO2 } from '../utils/co2Calculator'
import { getGalleryUrlsFromItem } from '../utils/itemImages'
import { getCategoryLabel, getConditionLabel } from '../utils/itemLabels'

export default function ItemDetailPage({ onExchangeItem, onDonationItem }) {
  const { itemId } = useParams()
  const { user } = useAuth()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    const fetchItem = async () => {
      if (!itemId) {
        setError('ไม่พบรายการนี้')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await itemsApi.getById(itemId)
        setItem(data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch item:', err)
        setError('โหลดรายการไม่ได้หรือไม่มีรายการนี้')
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [itemId])

  useEffect(() => {
    setActiveImageIndex(0)
  }, [itemId, item?.id])

  const galleryUrls = useMemo(() => (item ? getGalleryUrlsFromItem(item) : []), [item])

  const handleExchange = () => {
    if (onExchangeItem) {
      onExchangeItem(itemId)
    }
  }


  const formatDate = (dateString) => {
    if (!dateString) return 'ไม่ได้ระบุ'
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getDaysRemaining = (dateString) => {
    if (!dateString) return null
    // ใช้การเปรียบเทียบวันที่ (ไม่สนใจเวลา) เพื่อให้สอดคล้องกับ backend
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiryDate = new Date(dateString)
    expiryDate.setHours(0, 0, 0, 0)
    const diffTime = expiryDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg text-gray-600">กำลังโหลดรายละเอียด…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-lg font-semibold text-gray-900">{error || 'ไม่พบสินค้า'}</p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            <ArrowLeft size={16} />
            กลับหน้าแรก
          </Link>
        </div>
        </div>
      </div>
    )
  }

  const isInProgress = item.status === 'in_progress'
  const isOwner = user && user.id === item.user_id
  const daysRemaining = getDaysRemaining(item.available_until)
  const co2Footprint = calculateItemCO2(item.category, item.item_condition, {
    title: item.title,
    description: item.description,
    otherSubtype: item.other_subtype,
  })
  const mainImageSrc = galleryUrls[activeImageIndex] || galleryUrls[0]

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-6xl overflow-x-hidden px-4 py-3 sm:px-6 sm:py-5 lg:px-8">
        <Link
          to="/"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 transition hover:text-gray-900 sm:text-sm"
        >
          <ArrowLeft size={16} />
          <span>กลับหน้าแรก</span>
        </Link>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {/* Image column */}
            <div className="relative aspect-[16/12] w-full overflow-hidden bg-gray-100 sm:aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[460px]">
              {mainImageSrc ? (
                <img
                  src={
                    mainImageSrc?.startsWith('data:')
                      ? mainImageSrc
                      : `${mainImageSrc}?t=${Date.now()}`
                  }
                  alt={item.title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    console.error('[ITEM DETAIL] Failed to load image:', mainImageSrc?.substring(0, 100))
                    e.target.style.display = 'none'
                    const parent = e.target.parentElement
                    if (parent && !parent.querySelector('.error-placeholder')) {
                      const errorDiv = document.createElement('div')
                      errorDiv.className = 'error-placeholder flex h-full w-full items-center justify-center bg-gray-100 text-gray-400'
                      errorDiv.innerHTML = `
                        <div class="text-center">
                          <svg class="mx-auto mb-2" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                          <p class="text-xs">โหลดรูปไม่สำเร็จ</p>
                        </div>
                      `
                      parent.appendChild(errorDiv)
                    }
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                  <div className="text-center">
                    <Package size={48} className="mx-auto mb-2" />
                    <p className="text-sm">ไม่มีรูป</p>
                  </div>
                </div>
              )}
              {galleryUrls.length > 1 ? (
                <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 bg-gradient-to-t from-black/50 to-transparent p-2.5 pt-6">
                  {galleryUrls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImageIndex(i)}
                      className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                        i === activeImageIndex ? 'border-white ring-2 ring-primary' : 'border-white/40 opacity-90'
                      }`}
                    >
                      <img
                        src={url?.startsWith('data:') ? url : `${url}?t=${Date.now()}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
                {item.available_until && daysRemaining !== null && (
                  <>
                    {daysRemaining < 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 shadow-sm">
                        <Clock3 size={12} />
                        หมดอายุแล้ว
                      </span>
                    ) : daysRemaining <= 7 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700 shadow-sm">
                        <Clock3 size={12} />
                        เหลือ {daysRemaining} วัน
                      </span>
                    ) : null}
                  </>
                )}
              </div>
              <div className="absolute right-2.5 top-2.5">
                {isInProgress ? (
                  <span className="rounded-full bg-yellow-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                    กำลังดำเนินการ
                  </span>
                ) : item.listing_type === 'donation' ? (
                  <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                    บริจาค
                  </span>
                ) : (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                    แลกเปลี่ยน
                  </span>
                )}
              </div>
            </div>

            {/* Content column */}
            <div className="flex min-w-0 flex-col p-4 sm:p-5 lg:p-6">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {item.category && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    <Zap size={12} />
                    {getCategoryLabel(item.category, item.other_subtype)}
                  </span>
                )}
                {item.item_condition && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    <Package size={12} />
                    {getConditionLabel(item.item_condition)}
                  </span>
                )}
              </div>
              <h1 className="mb-2 text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                {item.title || 'ไม่มีชื่อสินค้า'}
              </h1>

              {item.description && (
                <div className="mb-3 rounded-xl bg-gray-50 px-3 py-2.5">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">รายละเอียด</p>
                  <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {item.description}
                  </p>
                </div>
              )}

              {/* Owner */}
              <div className="mb-3 rounded-xl bg-gray-50 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <UserIcon size={16} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">เจ้าของโพสต์</p>
                    <p className="truncate text-sm font-semibold text-gray-900">{item.owner_name || 'ไม่ได้ระบุ'}</p>
                    <p className="truncate text-[11px] text-gray-500">{item.owner_faculty || 'ไม่ได้ระบุคณะ'}</p>
                  </div>
                </div>
              </div>

              {/* Compact stats grid: 2 cols × 2 rows */}
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <Calendar size={14} className="shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">หมดอายุ</p>
                    <p className="truncate text-xs font-semibold text-gray-900">{formatDate(item.available_until)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
                  <Zap size={14} className="shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">CO₂</p>
                    <p className="truncate text-xs font-semibold text-primary-dark">{co2Footprint.toFixed(2)} กก. CO₂e</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <Package size={14} className="shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">จุดนัดรับ</p>
                    <p className="truncate text-xs font-semibold text-gray-900">{item.pickup_location || 'ไม่ได้ระบุ'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <Calendar size={14} className="shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">วันที่โพสต์</p>
                    <p className="truncate text-xs font-semibold text-gray-900">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              </div>

              {item.listing_type !== 'donation' && (
                <div className="mb-3 rounded-xl bg-yellow-50 px-3 py-2.5">
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-yellow-900">ต้องการแลกกับ</p>
                  <p className="line-clamp-2 text-sm text-yellow-800">{item.looking_for || 'ไม่ได้ระบุ'}</p>
                </div>
              )}

              {/* Action — sticky at bottom of viewport on mobile, inline on desktop */}
              <div className="mt-auto pt-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  {!isOwner && !isInProgress && item.status === 'active' && item.listing_type === 'donation' && (
                    <button
                      onClick={() => onDonationItem(item.id)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-600"
                    >
                      <Heart size={18} />
                      ขอรับบริจาค
                    </button>
                  )}
                  {!isOwner && !isInProgress && item.status === 'active' && item.listing_type !== 'donation' && (
                    <button
                      onClick={handleExchange}
                      className="flex-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-dark"
                    >
                      ขอแลกเปลี่ยน
                    </button>
                  )}
                  {isOwner && item.status === 'active' && (
                    <div className="flex-1 rounded-xl bg-blue-50 px-3 py-2.5 text-center">
                      <p className="text-xs font-semibold text-blue-900">นี่คือสินค้าของคุณ</p>
                      <p className="mt-0.5 text-[11px] text-blue-700">จัดการได้ที่หน้าโปรไฟล์</p>
                    </div>
                  )}
                  {isInProgress && (
                    <div className="flex-1 rounded-xl bg-yellow-50 px-3 py-2.5 text-center">
                      <p className="text-xs font-semibold text-yellow-900">สินค้านี้กำลังอยู่ในขั้นตอนดำเนินการ</p>
                    </div>
                  )}
                  {item.status === 'donated' && (
                    <div className="flex-1 rounded-xl bg-primary/5 px-3 py-2.5 text-center">
                      <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-dark">
                        <Heart size={16} className="text-primary" />
                        สินค้านี้ถูกบริจาคแล้ว
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

