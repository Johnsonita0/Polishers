import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const toastIcons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
}

function ToastItem({ toast, onDismiss }) {
  const Icon = toastIcons[toast.tone] || Info

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration)
    return () => window.clearTimeout(timer)
  }, [onDismiss, toast.duration, toast.id])

  return (
    <div className={`toast toast-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
      <Icon className="toast-icon" size={20} aria-hidden="true" />
      <div className="toast-copy">
        {toast.title && <strong>{toast.title}</strong>}
        <p>{toast.message}</p>
      </div>
      <button className="toast-dismiss" type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss message">
        <X size={17} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(({ tone = 'info', title, message, duration = 5000 }) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current.slice(-3), { id, tone, title, message, duration }])
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-viewport" aria-label="Notifications">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />)}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const showToast = useContext(ToastContext)
  if (!showToast) throw new Error('useToast must be used within ToastProvider')
  return showToast
}