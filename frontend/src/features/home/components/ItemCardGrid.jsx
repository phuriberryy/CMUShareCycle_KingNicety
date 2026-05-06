import { Clock3, Eye, Heart, MapPin, RefreshCcw, User as UserIcon } from 'lucide-react'
import { itemCoverUrl } from '../../../utils/itemImages'

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

export default function ItemCardGrid({ items, navigate, onExchangeItem, onDonationItem }) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:auto-rows-fr lg:grid-cols-3 lg:gap-6 xl:grid-cols-4 xl:gap-6">
      {items.map((item) => {
        const isInProgress = item.status === 'in_progress'
        const isDonated = item.status === 'donated'
        let daysLabel = null
        if (item.available_until) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const expiry = new Date(item.available_until)
          expiry.setHours(0, 0, 0, 0)
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
            className={`group flex h-full min-h-[520px] flex-col overflow-hidden rounded-2xl border border-gray-100/90 bg-white shadow-elevated ring-1 ring-black/[0.03] transition duration-200 sm:rounded-3xl lg:min-h-[540px] ${
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

            <div className="relative aspect-[4/3] min-h-[220px] w-full overflow-hidden bg-gray-100 lg:min-h-[240px]">
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

            <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 pt-2.5 sm:gap-3 sm:p-4 sm:pt-3 lg:gap-4">
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
                className="line-clamp-2 min-h-[3.25rem] cursor-pointer text-sm font-bold leading-snug tracking-tight text-gray-900 transition hover:text-primary sm:min-h-[3.5rem] sm:text-base"
              >
                {item.title}
              </h3>

              <div className="flex min-h-0 flex-1 flex-col border-t border-gray-50 pt-2 text-xs text-gray-500 sm:pt-3">
                <div className="min-h-0 space-y-1 sm:space-y-1.5 lg:space-y-2">
                  {expiryLine ? (
                    <p className="flex items-center gap-2 font-medium text-gray-600">
                      <Clock3 size={14} className="shrink-0 text-primary/70" />
                      <span>หมดอายุโพสต์ {expiryLine}</span>
                    </p>
                  ) : null}
                  {item.pickup_location ? (
                    <p className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-primary/70" />
                      <span className="line-clamp-2 leading-relaxed">{item.pickup_location}</span>
                    </p>
                  ) : null}
                  <p className="hidden items-center gap-2 sm:flex">
                    <UserIcon size={14} className="shrink-0 text-primary/70" />
                    <span className="truncate font-medium text-gray-600">{owner}</span>
                  </p>
                </div>
                <div className="mt-auto grid shrink-0 grid-cols-1 gap-1.5 pt-3 sm:gap-2 sm:pt-3 lg:pt-4">
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
                    className="sc-btn-secondary hidden min-h-10 w-full rounded-xl px-3 text-sm font-semibold sm:mt-0 sm:inline-flex"
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
  )
}
