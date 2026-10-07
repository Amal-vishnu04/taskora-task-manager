import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useDialogFocus } from './useDialogFocus'

export default function ConfirmDialog({ task, busy, onCancel, onConfirm }) {
  const dialogRef = useDialogFocus(Boolean(task))

  useEffect(() => {
    if (!task) return undefined
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [task, busy, onCancel])

  if (!task) return null

  return (
    <div className="dialog-backdrop">
      <section ref={dialogRef} className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" tabIndex={-1}>
        <button className="dialog-close" onClick={onCancel} disabled={busy} aria-label="Close confirmation"><X size={18} /></button>
        <span className="confirm-icon"><AlertTriangle size={21} /></span>
        <h2 id="delete-dialog-title">Delete this task?</h2>
        <p id="delete-dialog-description">“{task.title}” will be permanently removed from your task list.</p>
        <div className="dialog-actions">
          <button className="secondary-button" onClick={onCancel} disabled={busy} autoFocus>Keep task</button>
          <button className="danger-button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete task'}
          </button>
        </div>
      </section>
    </div>
  )
}