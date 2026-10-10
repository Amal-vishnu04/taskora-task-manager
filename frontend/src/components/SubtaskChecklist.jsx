import { useEffect, useRef, useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { createSubtask, deleteSubtask, getSubtasks, updateSubtask } from '../api/subtasks'
import { getApiErrorMessage } from '../api/errors'

export default function SubtaskChecklist({ taskId, onChanged }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const editInputRef = useRef(null)

  useEffect(() => {
    let active = true
    getSubtasks(taskId)
      .then(list => { if (active) setItems(list) })
      .catch(requestError => {
        if (active) setError(getApiErrorMessage(requestError, 'Subtasks could not be loaded.'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [taskId])

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus()
  }, [editingId])

  const completedCount = items.filter(item => item.completed).length
  const percent = items.length ? Math.round((completedCount / items.length) * 100) : 0

  function commit(next) {
    setItems(next)
    onChanged?.(next)
  }

  async function run(action) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Something went wrong. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  function handleAdd(event) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    run(async () => {
      const created = await createSubtask(taskId, title)
      commit([...items, created])
      setNewTitle('')
    })
  }

  function handleToggle(item) {
    run(async () => {
      const updated = await updateSubtask(taskId, item.id, { completed: !item.completed })
      commit(items.map(entry => (entry.id === item.id ? updated : entry)))
    })
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditTitle(item.title)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
  }

  function handleSaveEdit(item) {
    const title = editTitle.trim()
    if (!title) return
    if (title === item.title) {
      cancelEdit()
      return
    }
    run(async () => {
      const updated = await updateSubtask(taskId, item.id, { title })
      commit(items.map(entry => (entry.id === item.id ? updated : entry)))
      cancelEdit()
    })
  }

  function handleDelete(item) {
    run(async () => {
      await deleteSubtask(taskId, item.id)
      commit(items.filter(entry => entry.id !== item.id))
    })
  }

  function handleEditKeyDown(event, item) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSaveEdit(item)
    } else if (event.key === 'Escape') {
      event.stopPropagation()
      cancelEdit()
    }
  }

  return (
    <div className="subtasks">
      <h3 className="td-section-title">
        Checklist {items.length > 0 && <span className="td-count">{completedCount}/{items.length}</span>}
      </h3>

      {items.length > 0 && (
        <div className="subtask-progress">
          <div className="subtask-progress-label">
            <span>{completedCount} of {items.length} subtasks completed</span>
            <strong>{percent}%</strong>
          </div>
          <div className="subtask-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Subtask progress">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {loading && <p className="td-note" role="status">Loading subtasks…</p>}
      {!loading && items.length === 0 && !error && <p className="td-note">No subtasks yet. Break this task into small steps.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {items.length > 0 && (
        <ul className="subtask-list">
          {items.map(item => (
            <li key={item.id} className={item.completed ? 'subtask-item subtask-done' : 'subtask-item'}>
              <button
                type="button"
                className="subtask-check"
                role="checkbox"
                aria-checked={item.completed}
                aria-label={`${item.completed ? 'Reopen' : 'Complete'} ${item.title}`}
                disabled={busy}
                onClick={() => handleToggle(item)}
              >
                {item.completed && <Check size={13} strokeWidth={3} />}
              </button>

              {editingId === item.id ? (
                <input
                  ref={editInputRef}
                  className="text-input subtask-edit-input"
                  value={editTitle}
                  maxLength={255}
                  aria-label="Edit subtask title"
                  disabled={busy}
                  onChange={event => setEditTitle(event.target.value)}
                  onKeyDown={event => handleEditKeyDown(event, item)}
                />
              ) : (
                <span className="subtask-title">{item.title}</span>
              )}

              <div className="subtask-actions">
                {editingId === item.id ? (
                  <>
                    <button type="button" className="task-action-button" aria-label="Save subtask" title="Save" disabled={busy || !editTitle.trim()} onClick={() => handleSaveEdit(item)}>
                      <Check size={16} />
                    </button>
                    <button type="button" className="task-action-button" aria-label="Cancel editing" title="Cancel" disabled={busy} onClick={cancelEdit}>
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="task-action-button" aria-label={`Edit ${item.title}`} title="Edit" disabled={busy} onClick={() => startEdit(item)}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="task-action-button task-delete-button" aria-label={`Delete ${item.title}`} title="Delete" disabled={busy} onClick={() => handleDelete(item)}>
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="subtask-add" onSubmit={handleAdd}>
        <input
          className="text-input"
          type="text"
          placeholder="Add a subtask"
          aria-label="New subtask title"
          maxLength={255}
          value={newTitle}
          disabled={busy}
          onChange={event => setNewTitle(event.target.value)}
        />
        <button className="primary-button" type="submit" disabled={busy || !newTitle.trim()}>
          <Plus size={16} /> Add
        </button>
      </form>
    </div>
  )
}
