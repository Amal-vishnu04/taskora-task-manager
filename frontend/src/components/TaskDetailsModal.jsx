import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, CircleDot, Clock3, ImagePlus, Pencil, Plus, X } from 'lucide-react'
import { getTaskActivity } from '../api/activity'
import { getApiErrorMessage } from '../api/errors'
import { useDialogFocus } from './useDialogFocus'

const statusLabels = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' }

function formatDateTime(value) {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatRelative(value, now) {
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return ''
  const seconds = Math.max(0, Math.round((now - time) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDateTime(value)
}

function describeActivity(item) {
  const details = item.details || {}
  switch (item.action) {
    case 'task_created': return { label: 'Task created', Icon: Plus, tone: 'created' }
    case 'task_updated':
      return {
        label: Array.isArray(details.fields) && details.fields.length ? `Updated ${details.fields.join(', ')}` : 'Task updated',
        Icon: Pencil,
        tone: 'updated',
      }
    case 'task_completed': return { label: 'Marked as completed', Icon: Check, tone: 'completed' }
    case 'task_reopened': return { label: 'Task reopened', Icon: CircleDot, tone: 'reopened' }
    case 'status_changed':
      return {
        label: `Status: ${statusLabels[details.from] || details.from} → ${statusLabels[details.to] || details.to}`,
        Icon: Clock3,
        tone: 'updated',
      }
    case 'image_uploaded': return { label: 'Image uploaded', Icon: ImagePlus, tone: 'image' }
    case 'image_removed': return { label: 'Image removed', Icon: X, tone: 'reopened' }
    default: return { label: 'Activity recorded', Icon: CircleDot, tone: 'created' }
  }
}

export default function TaskDetailsModal({ task, onClose, onEdit }) {
  const dialogRef = useDialogFocus(true)
  const [now] = useState(() => Date.now())
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imageFailed, setImageFailed] = useState(false)
  const status = statusLabels[task.status] ? task.status : 'pending'
  const imageUrl = task.imageUrl || task.image_url
  const dueTime = task.dueDate ? Date.parse(task.dueDate) : NaN
  const overdue = status !== 'completed' && !Number.isNaN(dueTime) && dueTime < now

  useEffect(() => {
    let active = true
    getTaskActivity(task.id)
      .then(items => { if (active) setActivity(items) })
      .catch(requestError => {
        if (active) setError(getApiErrorMessage(requestError, 'Activity could not be loaded.'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [task.id])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="task-form-dialog task-details-dialog" role="dialog" aria-modal="true" aria-labelledby="task-details-title" tabIndex={-1}>
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">TASK DETAILS</p>
            <h2 id="task-details-title">{task.title}</h2>
          </div>
          <button className="dialog-close" onClick={onClose} aria-label="Close task details"><X size={18} /></button>
        </div>

        {imageUrl && (
          <div className="td-hero">
            {imageFailed
              ? <span className="td-hero-failed">Image unavailable</span>
              : <img src={imageUrl} alt={`Task image for ${task.title}`} onError={() => setImageFailed(true)} />}
          </div>
        )}

        <div className="td-info">
          <div className="td-info-item">
            <small>Status</small>
            <span className={`task-status status-${status}`}><span className="status-indicator" />{statusLabels[status]}</span>
          </div>
          <div className="td-info-item">
            <small>Due</small>
            <strong><CalendarDays size={14} /> {formatDateTime(task.dueDate)}</strong>
            {overdue && <span className="td-overdue"><AlertTriangle size={13} /> Overdue</span>}
          </div>
          <div className="td-info-item">
            <small>Created</small>
            <strong><Clock3 size={14} /> {formatDateTime(task.createdAt)}</strong>
          </div>
        </div>

        <h3 className="td-section-title">Description</h3>
        <p className="td-description">{task.description || 'No description provided.'}</p>

        <h3 className="td-section-title">Activity {!loading && !error && <span className="td-count">{activity.length}</span>}</h3>
        {loading && <p className="td-note" role="status">Loading activity…</p>}
        {!loading && error && <p className="form-error" role="alert">{error}</p>}
        {!loading && !error && activity.length === 0 && <p className="td-note">No activity recorded yet.</p>}
        {!loading && !error && activity.length > 0 && (
          <ol className="td-timeline">
            {activity.map(item => {
              const { label, Icon, tone } = describeActivity(item)
              return (
                <li key={item.id}>
                  <span className={`td-icon td-tone-${tone}`}><Icon size={14} /></span>
                  <div>
                    <strong>{label}</strong>
                    <small title={formatDateTime(item.createdAt)}>{item.userName} · {formatRelative(item.createdAt, now)}</small>
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Close</button>
          <button className="primary-button" type="button" onClick={() => onEdit(task)}><Pencil size={16} /> Edit task</button>
        </div>
      </section>
    </div>
  )
}
