import { useEffect, useState } from 'react'
import { Shield, Ban, CheckCircle, Trash2, Search } from 'lucide-react'
import { adminApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from '../../components/admin/ConfirmDialog'

export default function AdminUsersPage() {
  const { token } = useAuth()
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmState, setConfirmState] = useState(null)

  const fetchUsers = () => {
    if (!token) return
    setLoading(true)
    setError('')
    adminApi
      .listUsers(token, { page, pageSize, search })
      .then((res) => {
        setUsers(res.data || [])
        setTotal(res.pagination?.total || 0)
      })
      .catch((err) => {
        console.error('Failed to load users:', err)
        setError(err.message || 'Failed to load users')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  const openConfirm = (type, user) => {
    setConfirmState({ type, user, loading: false })
  }

  const closeConfirm = () => setConfirmState(null)

  const handleConfirm = async () => {
    if (!confirmState || !token) return
    const { type, user } = confirmState
    setConfirmState((prev) => ({ ...prev, loading: true }))
    try {
      if (type === 'make-admin' || type === 'make-user') {
        const nextRole = type === 'make-admin' ? 'admin' : 'user'
        await adminApi.updateUserRole(token, user.id, nextRole)
      } else if (type === 'suspend' || type === 'unsuspend') {
        const suspended = type === 'suspend'
        await adminApi.updateUserSuspension(token, user.id, suspended)
      } else if (type === 'delete') {
        await adminApi.deleteUser(token, user.id)
      }
      closeConfirm()
      fetchUsers()
    } catch (err) {
      console.error('Admin user action failed:', err)
      setConfirmState((prev) => ({ ...prev, loading: false }))
    }
  }

  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">ผู้ใช้</h1>
          <p className="mt-1 text-sm text-gray-600">
            จัดการบทบาท สถานะระงับ และลบบัญชีที่ถูกลบแบบ soft-delete
          </p>
        </div>
        <form onSubmit={handleSearchSubmit} className="w-full max-w-xs">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อหรืออีเมล"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white px-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading && <div className="p-4 text-sm text-gray-500">กำลังโหลดผู้ใช้...</div>}
        {error && !loading && <div className="p-4 text-sm text-red-600">{error}</div>}
        {!loading && !error && (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {users.map((user) => (
                <div key={user.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{user.name || 'ไม่ทราบชื่อ'}</p>
                      <p className="truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                    <button type="button" onClick={() => openConfirm('delete', user)} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600" aria-label="ลบผู้ใช้">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-1 text-primary"><Shield size={12} />{user.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้'}</span>
                    {user.is_suspended ? <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-red-700"><Ban size={12} />ถูกระงับ</span> : <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary-dark"><CheckCircle size={12} />ใช้งานอยู่</span>}
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => openConfirm(user.role === 'admin' ? 'make-user' : 'make-admin', user)} className="min-h-11 rounded-full border border-primary/20 px-3 py-2 text-xs font-semibold text-primary">{user.role === 'admin' ? 'ตั้งเป็นผู้ใช้' : 'ตั้งเป็นแอดมิน'}</button>
                    <button type="button" onClick={() => openConfirm(user.is_suspended ? 'unsuspend' : 'suspend', user)} className="min-h-11 rounded-full border border-yellow-200 px-3 py-2 text-xs font-semibold text-yellow-700">{user.is_suspended ? 'ยกเลิกระงับ' : 'ระงับ'}</button>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="px-2 py-6 text-center text-sm text-gray-500">ไม่พบผู้ใช้</p>}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-600">ผู้ใช้</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">บทบาท</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">สถานะ</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">วันที่สร้าง</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="align-top">
                      <td className="px-4 py-3"><div className="flex flex-col"><span className="font-semibold text-gray-900">{user.name || 'ไม่ทราบชื่อ'}</span><span className="text-xs text-gray-500">{user.email}</span></div></td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary"><Shield size={12} />{user.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้'}</span></td>
                      <td className="px-4 py-3">{user.is_suspended ? <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"><Ban size={12} />ถูกระงับ</span> : <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary-dark"><CheckCircle size={12} />ใช้งานอยู่</span>}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => openConfirm(user.role === 'admin' ? 'make-user' : 'make-admin', user)} className="rounded-full border border-primary/20 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5">{user.role === 'admin' ? 'ตั้งเป็นผู้ใช้' : 'ตั้งเป็นแอดมิน'}</button><button type="button" onClick={() => openConfirm(user.is_suspended ? 'unsuspend' : 'suspend', user)} className="rounded-full border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-50">{user.is_suspended ? 'ยกเลิกระงับ' : 'ระงับ'}</button><button type="button" onClick={() => openConfirm('delete', user)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"><Trash2 size={14} /></button></div></td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">ไม่พบผู้ใช้</td></tr>}
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
        title={
          confirmState?.type === 'delete'
            ? 'ลบผู้ใช้'
            : confirmState?.type === 'suspend'
            ? 'ระงับผู้ใช้'
            : confirmState?.type === 'unsuspend'
            ? 'ยกเลิกการระงับ'
            : confirmState?.type === 'make-admin'
            ? 'ตั้งเป็นแอดมิน'
            : confirmState?.type === 'make-user'
            ? 'ตั้งเป็นผู้ใช้ทั่วไป'
            : ''
        }
        description={
          confirmState?.user
            ? `ยืนยันการดำเนินการกับ ${confirmState.user.email} ?`
            : ''
        }
        loading={confirmState?.loading}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </div>
  )
}

