import { useEffect, useState } from 'react'
import { Filter, Trash2 } from 'lucide-react'
import { adminApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from '../../components/admin/ConfirmDialog'

export default function AdminItemsPage() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmState, setConfirmState] = useState(null)

  const fetchItems = () => {
    if (!token) return
    setLoading(true)
    setError('')
    adminApi
      .listItems(token, { page, pageSize, status })
      .then((res) => {
        setItems(res.data || [])
        setTotal(res.pagination?.total || 0)
      })
      .catch((err) => {
        console.error('Failed to load items:', err)
        setError(err.message || 'Failed to load items')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status])

  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  const openConfirm = (item) => {
    setConfirmState({ item, loading: false })
  }
  const closeConfirm = () => setConfirmState(null)

  const handleConfirm = async () => {
    if (!confirmState || !token) return
    const { item } = confirmState
    setConfirmState((prev) => ({ ...prev, loading: true }))
    try {
      await adminApi.deleteItem(token, item.id)
      closeConfirm()
      fetchItems()
    } catch (err) {
      console.error('Admin delete item failed:', err)
      setConfirmState((prev) => ({ ...prev, loading: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">สินค้า</h1>
          <p className="mt-1 text-sm text-gray-600">
            ตรวจสอบและลบโพสต์สินค้าที่มีปัญหาออกจากระบบ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value)
            }}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">ทุกสถานะ</option>
            <option value="active">ใช้งานอยู่</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="donated">บริจาคแล้ว</option>
            <option value="removed_by_admin">ถูกแอดมินลบ</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading && <div className="p-4 text-sm text-gray-500">กำลังโหลดสินค้า...</div>}
        {error && !loading && <div className="p-4 text-sm text-red-600">{error}</div>}
        {!loading && !error && (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{item.title}</p>
                      <p className="truncate text-xs text-gray-500">{item.category} · {item.item_condition}</p>
                    </div>
                    <button type="button" onClick={() => openConfirm(item)} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600" aria-label="ลบสินค้า"><Trash2 size={14} /></button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-gray-600">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1">{item.owner_name || 'ไม่ทราบเจ้าของ'}</span>
                    <span className="rounded-full bg-primary/5 px-2.5 py-1 text-primary">{item.status || 'ไม่ทราบ'}</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1">{item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</span>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="px-2 py-6 text-center text-sm text-gray-500">ไม่พบรายการสินค้า</p>}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                <thead className="bg-gray-50"><tr><th className="px-4 py-3 font-semibold text-gray-600">สินค้า</th><th className="px-4 py-3 font-semibold text-gray-600">เจ้าของ</th><th className="px-4 py-3 font-semibold text-gray-600">สถานะ</th><th className="px-4 py-3 font-semibold text-gray-600">วันที่สร้าง</th><th className="px-4 py-3 text-right font-semibold text-gray-600">การจัดการ</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id} className="align-top"><td className="px-4 py-3"><div className="flex flex-col"><span className="font-semibold text-gray-900">{item.title}</span><span className="text-xs text-gray-500">{item.category} · {item.item_condition}</span></div></td><td className="px-4 py-3"><div className="flex flex-col"><span className="text-sm text-gray-900">{item.owner_name || 'ไม่ทราบเจ้าของ'}</span><span className="text-xs text-gray-500">{item.owner_email}</span></div></td><td className="px-4 py-3 text-xs text-gray-600">{item.status || 'ไม่ทราบ'}</td><td className="px-4 py-3 text-xs text-gray-500">{item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => openConfirm(item)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"><Trash2 size={14} /></button></div></td></tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">ไม่พบรายการสินค้า</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            หน้า {page} จาก {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-700 disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-700 disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title="ลบสินค้า"
        description={
          confirmState?.item
            ? `ยืนยันการลบ "${confirmState.item.title}"? (รายการจะถูกซ่อนจากผู้ใช้ทั่วไป)`
            : ''
        }
        confirmLabel="ลบ"
        loading={confirmState?.loading}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </div>
  )
}

