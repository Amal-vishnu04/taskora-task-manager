import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(onDismiss, 4200)
    return () => window.clearTimeout(timeout)
  }, [toast, onDismiss])

  if (!toast) return null
  const Icon = toast.type === 'error' ? AlertCircle : CheckCircle2

  return (
    <div className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} />
      <span>{toast.message}</span>
      <button className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss message"><X size={16} /></button>
    </div>
  )
}