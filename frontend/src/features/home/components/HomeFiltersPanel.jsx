import { RefreshCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import Button from '../../../shared/ui/Button'
import Input from '../../../shared/ui/Input'
import Select from '../../../shared/ui/Select'

export default function HomeFiltersPanel({
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
  filtersOpen,
  onToggleFilters,
  onCloseFilters,
  categoryOptions,
  selectedCategory,
  onCategoryChange,
  conditionOptions,
  selectedCondition,
  onConditionChange,
  onPostItem,
}) {
  return (
    <div className="sticky top-[60px] z-20 py-1 sm:static sm:py-0">
      <div className="space-y-3.5 rounded-2xl border border-gray-100/90 bg-white p-4 shadow-sm ring-1 ring-gray-100/60 sm:space-y-4 sm:rounded-2xl sm:p-5">
        <label className="sr-only" htmlFor="search-items">
          ค้นหาสินค้า
        </label>
        <div className="flex items-center gap-2 sm:grid sm:grid-cols-[1.4fr_auto] sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              id="search-items"
              type="text"
              placeholder="ค้นหาชื่อหรือรายละเอียดสินค้า…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 border-gray-100 bg-gray-50/90 py-2 pl-9 pr-3 text-sm transition focus:bg-white"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-600 shadow-sm transition hover:border-primary/20 hover:bg-primary-light/40 hover:text-primary disabled:opacity-50"
              aria-label="โหลดรายการใหม่"
            >
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onToggleFilters}
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
            <Select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              options={categoryOptions}
            />
            <Select
              value={selectedCondition}
              onChange={(e) => onConditionChange(e.target.value)}
              options={conditionOptions}
            />
            <Button onClick={onPostItem} className="min-h-10 w-full sm:w-auto">
              โพสต์สินค้า
            </Button>
          </div>
        </div>
        {filtersOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 pb-0 sm:hidden"
            onClick={onCloseFilters}
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
                <button
                  type="button"
                  onClick={onCloseFilters}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
                  aria-label="ปิด"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={selectedCategory}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    options={categoryOptions}
                    className="h-11 text-sm"
                  />
                  <Select
                    value={selectedCondition}
                    onChange={(e) => onConditionChange(e.target.value)}
                    options={conditionOptions}
                    className="h-11 text-sm"
                  />
                </div>
                <Button onClick={onCloseFilters} className="min-h-11 w-full">
                  เสร็จแล้ว
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
