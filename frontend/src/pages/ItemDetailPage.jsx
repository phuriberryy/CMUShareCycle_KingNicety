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
  const co2Footprint = calculateItemCO2(item.category, item.item_condition)
  const mainImageSrc = galleryUrls[activeImageIndex] || galleryUrls[0]

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl overflow-x-hidden px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
        <Link
          to="/"
          className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          <span>กลับหน้าแรก</span>
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="relative aspect-[16/12] w-full overflow-hidden rounded-t-2xl bg-gray-100 sm:aspect-[4/3]">
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
                        <svg class="mx-auto mb-2" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p class="text-xs">Failed to load image</p>
                      </div>
                    `
                    parent.appendChild(errorDiv)
                  }
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                <div className="text-center">
                  <Package size={52} className="mx-auto mb-2 sm:size-16" />
                  <p className="text-sm">ไม่มีรูป</p>
                </div>
              </div>
            )}
            {galleryUrls.length > 1 ? (
              <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 bg-gradient-to-t from-black/50 to-transparent p-3 pt-8">
                {galleryUrls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImageIndex(i)}
                    className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 sm:h-16 sm:w-16 ${
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
            <div className="absolute left-3 top-3 flex flex-col gap-2 sm:left-4 sm:top-4">
              {item.available_until && daysRemaining !== null && (
                <>
                  {daysRemaining < 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700">
                      <Clock3 size={16} />
                      Expired
                    </span>
                  ) : daysRemaining <= 7 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1.5 text-sm font-semibold text-yellow-700">
                      <Clock3 size={16} />
                      {daysRemaining} days remaining
                    </span>
                  ) : null}
                </>
              )}
            </div>
            <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
              {isInProgress ? (
                <span className="rounded-full bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md sm:px-4 sm:py-2 sm:text-sm">
                  กำลังดำเนินการ
                </span>
              ) : item.listing_type === 'donation' ? (
                <span className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm">
                  Donation
                </span>
              ) : (
                <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm">
                  Exchange
                </span>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {item.category && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                    <Zap size={14} />
                    {item.category}
                  </span>
                )}
                {item.item_condition && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                    <Package size={14} />
                    {item.item_condition}
                  </span>
                )}
              </div>
              <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">{item.title || 'No item name'}</h1>
              {item.description && (
                <div className="mb-4 rounded-xl bg-gray-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-700">Description</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{item.description}</p>
                </div>
              )}
            </div>

            <div className="mb-5 space-y-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <UserIcon size={20} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Owner</p>
                    <p className="truncate font-semibold text-gray-900">{item.owner_name || 'ไม่ได้ระบุ'}</p>
                    <p className="truncate text-xs text-gray-600">{item.owner_email || 'ไม่ได้ระบุ'}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-gray-200 pt-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">Faculty</p>
                    <p className="font-medium text-gray-700">{item.owner_faculty || 'ไม่ได้ระบุ'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Pickup Location</p>
                    <p className="font-medium text-gray-700">{item.pickup_location || 'ไม่ได้ระบุ'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Calendar size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Available until</p>
                    <p className="font-semibold text-gray-900">{formatDate(item.available_until)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-primary/5 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Zap size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">CO₂ Footprint</p>
                    <p className="font-semibold text-primary-dark">{co2Footprint.toFixed(2)} kg CO₂e</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Calendar size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">วันที่โพสต์</p>
                  <p className="font-semibold text-gray-900">{formatDate(item.created_at)}</p>
                </div>
              </div>
            </div>

            {item.listing_type !== 'donation' && (
              <div className="mb-5 rounded-xl bg-yellow-50 p-4">
                <p className="mb-2 text-sm font-semibold text-yellow-900">Looking for:</p>
                <p className="text-sm text-yellow-800">{item.looking_for || 'ไม่ได้ระบุ'}</p>
              </div>
            )}

            <div className="sticky bottom-0 z-10 -mx-4 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
              <div className="flex flex-col gap-3 sm:flex-row">
                {!isOwner && !isInProgress && item.status === 'active' && item.listing_type === 'donation' && (
                  <button
                    onClick={() => onDonationItem(item.id)}
                    className="flex-1 items-center justify-center gap-2 rounded-full bg-red-500 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-red-600 sm:flex"
                  >
                    <Heart size={20} />
                    ขอรับบริจาค
                  </button>
                )}
                {!isOwner && !isInProgress && item.status === 'active' && item.listing_type !== 'donation' && (
                  <button
                    onClick={handleExchange}
                    className="flex-1 rounded-full bg-primary px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-primary-dark"
                  >
                    ขอแลกเปลี่ยน
                  </button>
                )}
                {isOwner && item.status === 'active' && (
                  <div className="flex-1 rounded-xl bg-blue-50 p-4 text-center">
                    <p className="text-sm font-semibold text-blue-900">นี่คือสินค้าของคุณ</p>
                    <p className="mt-1 text-xs text-blue-700">คุณสามารถจัดการสินค้าได้ที่หน้าโปรไฟล์</p>
                  </div>
                )}
                {isInProgress && (
                  <div className="flex-1 rounded-xl bg-yellow-50 p-4 text-center">
                    <p className="text-sm font-semibold text-yellow-900">สินค้านี้กำลังอยู่ในขั้นตอนดำเนินการ</p>
                  </div>
                )}
                {item.status === 'donated' && (
                  <div className="flex-1 rounded-xl bg-primary/5 p-4 text-center">
                    <p className="text-sm font-semibold text-primary-dark flex items-center justify-center gap-2">
                      <Heart size={20} className="text-primary" />
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
  )
}

