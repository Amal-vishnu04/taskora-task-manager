import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CalendarDays, Plus, Search, X } from 'lucide-react'
import { getApiErrorMessage } from '../../api/errors'
import api from '../../api/axios'
import { useLocation } from 'react-router-dom'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyTasks from '../../components/EmptyTasks'
import StatCard from '../../components/StatCard'
import TaskCard from '../../components/TaskCard'
import TaskFormModal from '../../components/TaskFormModal'
import Toast from '../../components/Toast'
import { matchesDueDateFilter } from '../../utils/taskDates'

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

const dueDateOptions = [
  { value: '', label: 'Any deadline' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due Today' },
  { value: 'tomorrow', label: 'Due Tomorrow' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'no_due_date', label: 'No Due Date' },
]

export default function Dashboard() {
  const location = useLocation()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dueDateFilter, setDueDateFilter] = useState('')
  const [nowTimestamp, setNowTimestamp] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [saving, setSaving] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const deletingRef = useRef(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let active = true
    api.get('/tasks')
      .then(response => {
        if (active) setTasks(Array.isArray(response.data.tasks) ? response.data.tasks : [])
      })
      .catch(requestError => {
        if (active) setError(getApiErrorMessage(requestError, 'Tasks could not be loaded. Please try again.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [reloadKey])

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      if (location.hash === '#tasks') {
        document.getElementById('tasks')?.scrollIntoView({ behavior, block: 'start' })
      } else if (!location.hash) {
        window.scrollTo({ top: 0, behavior })
      }
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [location.hash, location.pathname])

  useEffect(() => {
    const initialClock = window.setTimeout(() => setNowTimestamp(Date.now()), 0)
    const clockInterval = window.setInterval(() => setNowTimestamp(Date.now()), 30000)
    return () => {
      window.clearTimeout(initialClock)
      window.clearInterval(clockInterval)
    }
  }, [])

  const statistics = tasks.reduce((counts, task) => {
    counts.total += 1
    if (Object.hasOwn(counts, task.status)) counts[task.status] += 1
    return counts
  }, { total: 0, pending: 0, in_progress: 0, completed: 0 })
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredTasks = tasks.filter((task) => {
    const matchesQuery = !normalizedQuery
      || task.title?.toLowerCase().includes(normalizedQuery)
      || task.description?.toLowerCase().includes(normalizedQuery)
    return matchesQuery
      && (!statusFilter || task.status === statusFilter)
      && matchesDueDateFilter(task, dueDateFilter, nowTimestamp)
  })
  const filtersActive = Boolean(normalizedQuery || statusFilter || dueDateFilter)

  function clearFilters() {
    setSearchQuery('')
    setStatusFilter('')
    setDueDateFilter('')
  }

  function showToast(type, message) {
    setToast({ id: Date.now(), type, message })
  }

  function startCreate() {
    setEditingTask(null)
    setFormOpen(true)
  }

  function startEdit(task) {
    setEditingTask(task)
    setFormOpen(true)
  }

  async function saveTask(values) {
    setSaving(true)
    try {
      if (editingTask) {
        const response = await api.put(`/tasks/${editingTask.id}`, values)
        setTasks(current => current.map(task => task.id === editingTask.id ? response.data.task : task))
        showToast('success', 'Task updated.')
      } else {
        const response = await api.post('/tasks', values)
        setTasks(current => [response.data.task, ...current])
        showToast('success', 'Task created.')
      }
      setFormOpen(false)
      setEditingTask(null)
    } catch (requestError) {
      showToast('error', getApiErrorMessage(requestError, `Unable to ${editingTask ? 'update' : 'create'} task. Please try again.`))
      throw requestError
    } finally {
      setSaving(false)
    }
  }

  async function deleteTask() {
    if (!taskToDelete || deletingRef.current) return
    deletingRef.current = true
    setDeleting(true)
    try {
      await api.delete(`/tasks/${taskToDelete.id}`)
      setTasks(current => current.filter(task => task.id !== taskToDelete.id))
      showToast('success', 'Task removed.')
      setTaskToDelete(null)
    } catch (requestError) {
      showToast('error', getApiErrorMessage(requestError, 'Unable to delete task. Please try again.'))
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }

  return (
    <div className="dashboard-page">
      <section className="welcome-row" id="overview">
        <div>
          <p className="eyebrow">YOUR WORK</p>
          <h2>Everything you’re moving forward today.</h2>
          <p className="welcome-subtitle">Keep each priority clear, focused, and moving.</p>
        </div>
        <div className="date-stamp"><span className="date-stamp-dot" /> TASKORA WORKSPACE</div>
      </section>

      <section className="stats-grid" aria-label="Task statistics">
        <StatCard kind="total" label="Total Tasks" value={loading ? '—' : statistics.total} />
        <StatCard kind="pending" label="Pending" value={loading ? '—' : statistics.pending} />
        <StatCard kind="in_progress" label="In Progress" value={loading ? '—' : statistics.in_progress} />
        <StatCard kind="completed" label="Completed" value={loading ? '—' : statistics.completed} />
      </section>

      <section className="task-section" id="tasks" aria-labelledby="tasks-heading">
        <div className="tasks-toolbar">
          <div>
            <p className="eyebrow">YOUR PRIORITIES</p>
            <h2 id="tasks-heading">Your Work</h2>
          </div>
          <div className="tasks-toolbar-actions">
            <div className="task-search">
              <Search size={17} aria-hidden="true" />
              <input
                id="task-search-input"
                type="search"
                aria-label="Search tasks by title or description"
                placeholder="Search your work..."
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" type="button" aria-label="Clear search" onClick={() => setSearchQuery('')}>
                  <X size={15} />
                </button>
              )}
            </div>
            <label className="filter-select-wrap">
              <span className="sr-only">Filter tasks by status</span>
              <select aria-label="Filter tasks by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                {statusOptions.map(option => <option key={option.value || 'all-statuses'} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="filter-select-wrap filter-date-wrap">
              <CalendarDays size={15} aria-hidden="true" />
              <span className="sr-only">Filter tasks by due date</span>
              <select aria-label="Filter tasks by due date" value={dueDateFilter} onChange={event => setDueDateFilter(event.target.value)}>
                {dueDateOptions.map(option => <option key={option.value || 'all-due-dates'} value={option.value}>{option.label}</option>)}
              </select>
            </label>
              <button className="primary-button create-task-button" onClick={startCreate}>
                <Plus size={17} /><span>Create Task</span>
            </button>
          </div>
        </div>

        {!loading && !error && (
          <div className="filter-summary" aria-live="polite">
            <span>{filtersActive ? `Showing ${filteredTasks.length} of ${tasks.length} tasks` : `Showing all ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}</span>
            {filtersActive && <button className="clear-filters-button" onClick={clearFilters}>Reset</button>}
          </div>
        )}

        {loading && <div className="task-state" role="status"><span className="loading-mark" /> Loading your tasks…</div>}
        {!loading && error && (
          <div className="task-error" role="alert">
            <AlertCircle size={19} /><span>{error}</span>
            <button className="secondary-button retry-button" onClick={() => { setError(''); setLoading(true); setReloadKey(key => key + 1) }}>Try again</button>
          </div>
        )}
        {!loading && !error && tasks.length === 0 && (
          <EmptyTasks onCreate={startCreate} />
        )}
        {!loading && !error && tasks.length > 0 && filteredTasks.length === 0 && (
          <section className="no-matching-tasks" aria-live="polite">
            <span className="empty-state-icon"><Search size={24} /></span>
            <h3>No matching work.</h3>
            <p>Try adjusting your search or filters.</p>
            <button className="text-action" onClick={clearFilters}>Reset filters</button>
          </section>
        )}
        {!loading && !error && filteredTasks.length > 0 && (
          <div className="task-grid">
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} nowTimestamp={nowTimestamp} onEdit={startEdit} onDelete={setTaskToDelete} />
            ))}
          </div>
        )}
      </section>
      <p className="dashboard-footnote">Organize. Focus. Complete.</p>
      {formOpen && <TaskFormModal
        open={formOpen}
        task={editingTask}
        saving={saving}
        onClose={() => { setFormOpen(false); setEditingTask(null) }}
        onSave={saveTask}
      />}
      <ConfirmDialog task={taskToDelete} busy={deleting} onCancel={() => setTaskToDelete(null)} onConfirm={deleteTask} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}