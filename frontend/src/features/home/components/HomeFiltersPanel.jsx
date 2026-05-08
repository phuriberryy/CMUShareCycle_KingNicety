import { Plus, RefreshCcw, Search, SlidersHorizontal, X } from 'lucide-react'
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
    <div className="sticky top-[58px] z-20 py-0 sm:static">
      <div className="space-y-3 rounded-none border-0 bg-transparent p-0 shadow-none ring-0 sm:space-y-4 sm:rounded-2xl sm:border sm:border-gray-100/90 sm:bg-white sm:p-5 sm:shadow-sm sm:ring-1 sm:ring-gray-100/60">
        <label className="sr-only" htmlFor="search-items">
          ค้นหาสินค้า
        </label>
        <div className="flex items-center gap-2 rounded-[20px] bg-white/95 p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-gray-100/80 backdrop-blur sm:grid sm:grid-cols-[1.4fr_auto] sm:items-center sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0">
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
              className="h-9 rounded-full border-transparent bg-gray-50/80 py-2 pl-9 pr-3 text-[13px] transition focus:bg-white sm:h-10 sm:rounded-xl sm:border-gray-100 sm:text-sm"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-600 transition hover:border-primary/20 hover:bg-primary-light/40 hover:text-primary disabled:opacity-50 sm:h-10 sm:w-10 sm:border sm:border-gray-100 sm:bg-white sm:shadow-sm sm:rounded-xl"
              aria-label="โหลดรายการใหม่"
            >
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onToggleFilters}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary-dark transition hover:border-primary/20 hover:bg-primary-light/80 active:scale-95 sm:hidden"
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
              <Plus size={17} className="shrink-0" />
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
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={onCloseFilters}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
                    aria-label="ปิด"
                  >
                    <X size={18} />
                  </button>
                </div>
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
