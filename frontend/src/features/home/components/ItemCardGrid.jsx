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
    <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-3.5 px-0 sm:grid-cols-2 sm:gap-5 lg:auto-rows-fr lg:grid-cols-[repeat(auto-fit,minmax(330px,1fr))] lg:px-0 xl:grid-cols-3">
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
            className={`group flex w-full flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] transition duration-200 sm:h-full sm:min-h-[520px] sm:rounded-[18px] lg:min-h-[unset] ${
              isInProgress ? 'cursor-not-allowed opacity-75' : 'hover:-translate-y-1 hover:border-black/[0.08] hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]'
            }`}
          >
            <div className="flex items-center gap-2 bg-white px-3 py-2 sm:gap-3 sm:border-b sm:border-gray-50 sm:bg-gradient-to-r sm:from-gray-50/80 sm:to-white sm:px-4 sm:py-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-[9px] font-bold tracking-tight text-primary-dark ring-2 ring-white shadow-sm sm:h-10 sm:w-10 sm:text-xs">
                {ownerInitials(owner)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-gray-900 sm:text-sm">{owner}</p>
                <p className="truncate text-[11px] text-gray-500 sm:text-xs">{faculty || 'มหาวิทยาลัยเชียงใหม่'}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary-dark shadow-sm ring-1 ring-primary/15 transition hover:bg-primary/10 hover:text-primary sm:hidden"
                onClick={() => navigate(`/items/${item.id}`)}
                aria-label="เปิดรายละเอียดสินค้า"
              >
                <Eye size={15} strokeWidth={2.4} />
              </button>
            </div>

            <div className="relative aspect-[16/8.7] w-full overflow-hidden bg-gray-100 sm:aspect-[16/10]">
              <img
                src={itemCoverUrl(item) || 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80'}
                alt={item.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5 sm:p-3">
                {daysLabel ? (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur-[2px] sm:px-2.5 sm:py-1 sm:text-[11px] ${daysLabel.style}`}>
                    <Clock3 size={12} className="shrink-0" />
                    {daysLabel.text}
                  </span>
                ) : (
                  <span />
                )}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-md sm:px-2.5 sm:py-1 sm:text-[11px] ${
                    isInProgress ? 'bg-amber-500' : item.listing_type === 'donation' ? 'bg-rose-500' : 'bg-primary'
                  }`}
                >
                  {isInProgress ? 'ดำเนินการ' : item.listing_type === 'donation' ? 'บริจาค' : 'แลกเปลี่ยน'}
                </span>
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-1.5 p-3 pt-2.5 sm:flex-1 sm:gap-2 sm:p-3 sm:pt-2.5 lg:gap-2 lg:p-3 lg:pt-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex max-w-full truncate rounded-full bg-primary-light/70 px-2 py-0.5 text-[10px] font-semibold text-primary-dark ring-1 ring-primary/10 sm:px-2.5 sm:text-[11px]">
                  #{item.category}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700 ring-1 ring-gray-200/80 sm:px-2.5 sm:text-[11px]">
                  {item.item_condition}
                </span>
              </div>

              <h3
                onClick={() => navigate(`/items/${item.id}`)}
                className="line-clamp-1 min-h-[1.25rem] cursor-pointer text-[13px] font-bold leading-snug tracking-tight text-gray-900 transition hover:text-primary sm:min-h-[1.45rem] sm:text-[15px]"
              >
                {item.title}
              </h3>

              <div className="flex min-h-0 flex-col border-t border-gray-50 pt-2 text-xs text-gray-500 sm:flex-1 sm:pt-2.5">
                <div className="hidden min-h-0 space-y-1.5 sm:block sm:space-y-1.5">
                  {expiryLine ? (
                    <p className="flex items-center gap-2 font-medium text-gray-600">
                      <Clock3 size={14} className="shrink-0 text-primary/70" />
                      <span>หมดอายุโพสต์ {expiryLine}</span>
                    </p>
                  ) : null}
                  {item.pickup_location ? (
                    <p className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-primary/70" />
                      <span className="line-clamp-1 leading-relaxed">{item.pickup_location}</span>
                    </p>
                  ) : null}
                  <p className="hidden items-center gap-2 sm:flex">
                    <UserIcon size={14} className="shrink-0 text-primary/70" />
                    <span className="truncate font-medium text-gray-600">{owner}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 pt-1.5 sm:mt-auto sm:pt-3 lg:gap-2 lg:pt-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/items/${item.id}`)}
                    className="sc-btn-primary min-h-8 w-full rounded-xl px-3 text-[13px] font-semibold shadow-sm sm:hidden"
                  >
                    {item.status === 'active' && item.listing_type === 'donation' ? <Heart size={16} className="shrink-0" /> : item.status === 'active' && item.listing_type !== 'donation' ? <RefreshCcw size={16} className="shrink-0" /> : <Eye size={16} className="shrink-0" />}
                    {mobileActionLabel}
                  </button>
                  {item.status === 'active' && item.listing_type === 'donation' ? (
                    <button
                      type="button"
                      onClick={() => onDonationItem(item.id)}
                      className="hidden h-[34px] flex-1 items-center justify-center gap-2.5 rounded-lg bg-rose-500 px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-rose-600 sm:inline-flex"
                    >
                      <Heart size={18} className="shrink-0" />
                      ขอรับบริจาค
                    </button>
                  ) : item.status === 'active' && item.listing_type !== 'donation' ? (
                    <button
                      type="button"
                      onClick={() => onExchangeItem(item.id)}
                      className="hidden h-[34px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-2.5 text-[13px] font-semibold text-white shadow-sm ring-1 ring-white/20 transition hover:bg-primary-dark sm:inline-flex"
                    >
                      <RefreshCcw size={16} className="shrink-0" />
                      <span className="whitespace-nowrap">ขอแลกเปลี่ยน</span>
                    </button>
                  ) : (
                    <div className="hidden h-[34px] flex-1 cursor-default items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 text-[13px] font-medium text-gray-500 sm:flex">
                      {primaryActionLabel}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/items/${item.id}`)}
                    className="sc-btn-secondary hidden h-[34px] flex-1 rounded-lg px-3 text-[13px] font-semibold sm:mt-0 sm:gap-2.5 sm:inline-flex"
                  >
                    <Eye size={18} className="shrink-0" />
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
