import { useEffect } from 'react'
import { AlertTriangle, Trash2, HelpCircle } from 'lucide-react'

/**
 * ConfirmDialog — popup ยืนยันที่ออกแบบให้สวยและใช้ซ้ำได้
 * @param {boolean} open
 * @param {string} title
 * @param {string|JSX.Element} description
 * @param {'danger'|'warning'|'primary'} [variant='danger']
 * @param {string} [confirmLabel='ยืนยัน']
 * @param {string} [cancelLabel='ยกเลิก']
 * @param {() => void} onConfirm
 * @param {() => void} onCancel
 * @param {boolean} [loading]
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  variant = 'danger',
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  onConfirm,
  onCancel,
  loading = false,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, loading, onCancel])

  if (!open) return null

  const tone = {
    danger: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      icon: Trash2,
      btn: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
    },
    warning: {
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      icon: AlertTriangle,
      btn: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500',
    },
    primary: {
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      icon: HelpCircle,
      btn: 'bg-primary hover:bg-primary-dark focus-visible:ring-primary',
    },
  }[variant] || {}
  const Icon = tone.icon

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-4 pt-10 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel?.()
      }}
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-4 px-6 pb-2 pt-8 text-center sm:px-8">
          {Icon ? (
            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${tone.iconBg}`}>
              <Icon size={26} className={tone.iconColor} strokeWidth={2.2} />
            </div>
          ) : null}
          <h2
            id="confirm-dialog-title"
            className="text-lg font-bold leading-snug tracking-tight text-gray-900 sm:text-xl"
          >
            {title}
          </h2>
          {description ? (
            <div className="text-sm leading-relaxed text-gray-600 sm:text-[15px]">{description}</div>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 px-6 pb-6 pt-5 sm:flex-row sm:justify-center sm:gap-3 sm:px-8">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[120px]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[120px] ${tone.btn}`}
          >
            {loading ? 'กำลังดำเนินการ...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
