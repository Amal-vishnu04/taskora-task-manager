import { AlertTriangle, CalendarDays, Check, Clock3, Eye, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { isTaskOverdue } from '../utils/taskDates'

const statusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
}

function formatDueDate(value) {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default function TaskCard({ task, nowTimestamp, subtaskSummary, onOpen, onEdit, onDelete }) {
  const [failedImageUrl, setFailedImageUrl] = useState('')
  const status = statusLabels[task.status] ? task.status : 'pending'
  const overdue = isTaskOverdue(task, nowTimestamp)
  const imageUrl = task.imageUrl || task.image_url
  const showImage = imageUrl && failedImageUrl !== imageUrl

  return (
    <article className="task-card">
      <div className="task-card-topline">
        <span className={`task-status status-${status}`}>
          <span className="status-indicator" />{statusLabels[status]}
        </span>
        <div className="task-actions">
          <button className="task-action-button" onClick={() => onOpen(task)} aria-label={`View details for ${task.title}`} title="View details">
            <Eye size={16} />
          </button>
          <button className="task-action-button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} title="Edit task">
            <Pencil size={16} />
          </button>
          <button className="task-action-button task-delete-button" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`} title="Delete task">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {showImage && (
        <div className="task-image-frame">
          <img
            key={imageUrl}
            src={imageUrl}
            alt={`Task image for ${task.title}`}
            loading="lazy"
            onError={() => setFailedImageUrl(imageUrl)}
          />
        </div>
      )}
      {imageUrl && failedImageUrl === imageUrl && (
        <div className="task-image-frame task-image-failed" role="img" aria-label={`Image unavailable for ${task.title}`}>
          <span>Image unavailable</span>
        </div>
      )}
      <div className="task-card-copy">
        <h3>{task.title}</h3>
        <p>{task.description || 'No description provided.'}</p>
        {subtaskSummary && subtaskSummary.total > 0 && (
          <div className="subtask-mini">
            <div className="subtask-bar" aria-hidden="true">
              <span style={{ width: `${Math.round((subtaskSummary.completed / subtaskSummary.total) * 100)}%` }} />
            </div>
            <small>{subtaskSummary.completed} of {subtaskSummary.total} subtasks completed</small>
          </div>
        )}
      </div>
      <div className="task-card-footer">
        <span className="task-due-label"><CalendarDays size={15} /> Due date</span>
        <span className="task-due-value">
          {task.dueDate ? <Clock3 size={14} /> : <Check size={14} />}
          {formatDueDate(task.dueDate)}
        </span>
        {overdue && <span className="overdue-label"><AlertTriangle size={14} />OVERDUE</span>}
      </div>
    </article>
  )
}