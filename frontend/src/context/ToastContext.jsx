import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const TOAST_DURATION = 4000

const toastStyles = {
  success: {
    bg: 'bg-green-50 border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-500',
    title: 'text-green-800',
    message: 'text-green-700'
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: XCircle,
    iconColor: 'text-red-500',
    title: 'text-red-800',
    message: 'text-red-700'
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    icon: AlertCircle,
    iconColor: 'text-yellow-500',
    title: 'text-yellow-800',
    message: 'text-yellow-700'
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: Info,
    iconColor: 'text-blue-500',
    title: 'text-blue-800',
    message: 'text-blue-700'
  }
}

function Toast({ toast, onClose }) {
  const style = toastStyles[toast.type] || toastStyles.info
  const Icon = style.icon

  return (
    <div 
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-lg
        ${style.bg}
        animate-slide-in
        max-w-sm w-full
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`font-semibold text-sm ${style.title}`}>
            {toast.title}
          </p>
        )}
        <p className={`text-sm ${style.message} ${toast.title ? 'mt-1' : ''}`}>
          {toast.message}
        </p>
      </div>
      <button 
        onClick={() => onClose(toast.id)}
        className={`flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors ${style.iconColor}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback(({ type = 'info', title, message, duration = TOAST_DURATION }) => {
    const id = Date.now() + Math.random()
    const newToast = { id, type, title, message }
    
    setToasts(prev => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }

    return id
  }, [removeToast])

  const toast = {
    success: (message, title) => addToast({ type: 'success', message, title }),
    error: (message, title) => addToast({ type: 'error', message, title }),
    warning: (message, title) => addToast({ type: 'warning', message, title }),
    info: (message, title) => addToast({ type: 'info', message, title }),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      
      {/* Toast Container */}
      <div 
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
