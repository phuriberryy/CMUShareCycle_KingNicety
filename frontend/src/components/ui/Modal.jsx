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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
      <div
        className={`relative z-10 w-full ${sizeClasses[size]} max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-t-2xl">
            <div className="flex-1 pr-4">
              {title && (
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
              )}
              {subtitle && (
                <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-gray-600 leading-relaxed">{subtitle}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="p-4 sm:p-6 pb-safe">{children}</div>
      </div>
    </div>
  )
}










