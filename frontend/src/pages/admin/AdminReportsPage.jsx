import { useEffect, useState } from 'react'
import { Flag } from 'lucide-react'
import { adminApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from '../../components/admin/ConfirmDialog'

const statusBadges = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-primary/10 text-primary-dark',
  rejected: 'bg-gray-100 text-gray-700',
}

const STATUS_LABEL_TH = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติ',
  rejected: 'ปฏิเสธ',
}

function statusLabel(status) {
  return STATUS_LABEL_TH[status] || status || '-'
}

export default function AdminReportsPage() {
  const { token } = useAuth()
  const [reports, setReports] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmState, setConfirmState] = useState(null)

  const fetchReports = () => {
    if (!token) return
    setLoading(true)
    setError('')
    adminApi
      .listReports(token, { page, pageSize, status })
      .then((res) => {
        setReports(res.data || [])
        setTotal(res.pagination?.total || 0)
      })
      .catch((err) => {
        console.error('Failed to load reports:', err)
        setError(err.message || 'Failed to load reports')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status])

  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  const openConfirm = (report, nextStatus) => {
    setConfirmState({ report, status: nextStatus, loading: false })
  }

  const closeConfirm = () => setConfirmState(null)

  const handleConfirm = async () => {
    if (!confirmState || !token) return
    const { report, status: nextStatus } = confirmState
    setConfirmState((prev) => ({ ...prev, loading: true }))
    try {
      await adminApi.updateReportStatus(token, report.id, nextStatus)
      closeConfirm()
      fetchReports()
    } catch (err) {
      console.error('Admin update report status failed:', err)
      setConfirmState((prev) => ({ ...prev, loading: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">รายงาน</h1>
          <p className="mt-1 text-sm text-gray-600">
            ตรวจสอบรายงานการละเมิดและตัดสินใจอนุมัติหรือปฏิเสธ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value)
            }}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">ทุกสถานะ</option>
            <option value="pending">รอตรวจสอบ</option>
            <option value="approved">อนุมัติ</option>
            <option value="rejected">ปฏิเสธ</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading && <div className="p-4 text-sm text-gray-500">กำลังโหลดรายงาน...</div>}
        {error && !loading && <div className="p-4 text-sm text-red-600">{error}</div>}
        {!loading && !error && (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {reports.map((report) => (
                <div key={report.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600"><Flag size={14} /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{report.reason || 'ไม่ได้ระบุเหตุผล'}</p>
                        <p className="truncate text-xs text-gray-500">{report.reporter_email ? `โดย ${report.reporter_email}` : 'ผู้รายงานไม่เปิดเผย'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadges[report.status] || 'bg-gray-100 text-gray-700'}`}>{statusLabel(report.status)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold uppercase tracking-wide">{report.target_type}</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1">ID: {report.target_id}</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1">{report.created_at ? new Date(report.created_at).toLocaleString() : '-'}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {report.status !== 'approved' && <button type="button" onClick={() => openConfirm(report, 'approved')} className="min-h-11 rounded-full bg-primary/10 px-3 py-2 text-xs font-semibold text-primary-dark">อนุมัติ</button>}
                    {report.status !== 'rejected' && <button type="button" onClick={() => openConfirm(report, 'rejected')} className="min-h-11 rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">ปฏิเสธ</button>}
                  </div>
                </div>
              ))}
              {reports.length === 0 && <p className="px-2 py-6 text-center text-sm text-gray-500">ไม่พบรายงาน</p>}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm"><thead className="bg-gray-50"><tr><th className="px-4 py-3 font-semibold text-gray-600">รายงาน</th><th className="px-4 py-3 font-semibold text-gray-600">เป้าหมาย</th><th className="px-4 py-3 font-semibold text-gray-600">สถานะ</th><th className="px-4 py-3 font-semibold text-gray-600">วันที่</th><th className="px-4 py-3 text-right font-semibold text-gray-600">การจัดการ</th></tr></thead><tbody className="divide-y divide-gray-100">{reports.map((report) => (<tr key={report.id} className="align-top"><td className="px-4 py-3"><div className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-600"><Flag size={14} /></span><div><p className="text-sm font-semibold text-gray-900">{report.reason || 'ไม่ได้ระบุเหตุผล'}</p>{report.reporter_email && (<p className="mt-1 text-xs text-gray-500">โดย {report.reporter_email}</p>)}</div></div></td><td className="px-4 py-3 text-xs text-gray-600"><div className="flex flex-col"><span className="font-semibold uppercase tracking-wide">{report.target_type}</span><span className="text-gray-500">ID: {report.target_id}</span></div></td><td className="px-4 py-3"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadges[report.status] || 'bg-gray-100 text-gray-700'}`}>{statusLabel(report.status)}</span></td><td className="px-4 py-3 text-xs text-gray-500">{report.created_at ? new Date(report.created_at).toLocaleString() : '-'}</td><td className="px-4 py-3"><div className="flex justify-end gap-2">{report.status !== 'approved' && (<button type="button" onClick={() => openConfirm(report, 'approved')} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-dark hover:bg-primary/15">อนุมัติ</button>)}{report.status !== 'rejected' && (<button type="button" onClick={() => openConfirm(report, 'rejected')} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200">ปฏิเสธ</button>)}</div></td></tr>))}{reports.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">ไม่พบรายงาน</td></tr>}</tbody></table>
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
          confirmState?.status === 'approved' ? 'อนุมัติรายงาน' : 'ปฏิเสธรายงาน'
        }
        description={
          confirmState?.report
            ? 'ยืนยันการเปลี่ยนสถานะรายงานนี้?'
            : ''
        }
        loading={confirmState?.loading}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </div>
  )
}

