import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  mobileFullScreen = false,
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
      <div
        className={`relative z-10 flex w-full flex-col bg-white shadow-2xl ${sizeClasses[size]} ${mobileFullScreen ? 'h-dvh max-h-dvh rounded-none sm:max-h-[90vh] sm:rounded-2xl' : 'max-h-[95vh] rounded-t-2xl sm:rounded-2xl sm:max-h-[90vh]'} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex-1 pr-4">
              {title && (
                <h2 className="text-lg font-bold text-gray-900 sm:text-xl">{title}</h2>
              )}
              {subtitle && (
                <p className="mt-1 text-xs leading-relaxed text-gray-600 sm:mt-1.5 sm:text-sm">{subtitle}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="ปิด"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-safe sm:px-6">{children}</div>
      </div>
    </div>
  )
}










