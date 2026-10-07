function localDateKey(timestamp) {
  const parts = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp))
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function localDateOffsetKey(timestamp, offset) {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return localDateKey(date.getTime())
}

export function matchesDueDateFilter(task, filter, nowTimestamp) {
  if (!filter) return true
  if (!task.dueDate) return filter === 'no_due_date'
  if (nowTimestamp === null || nowTimestamp === undefined) return false

  const dueTimestamp = Date.parse(task.dueDate)
  if (Number.isNaN(dueTimestamp)) return false
  if (filter === 'overdue') return task.status !== 'completed' && dueTimestamp < nowTimestamp
  if (filter === 'no_due_date') return false

  const dueDay = localDateKey(dueTimestamp)
  const today = localDateKey(nowTimestamp)
  if (filter === 'today') return dueDay === today
  if (filter === 'tomorrow') return dueDay === localDateOffsetKey(nowTimestamp, 1)
  if (filter === 'upcoming') return dueDay > localDateOffsetKey(nowTimestamp, 1)
  return true
}

export function isTaskOverdue(task, nowTimestamp) {
  if (!task.dueDate || task.status === 'completed' || nowTimestamp === null || nowTimestamp === undefined) {
    return false
  }
  const dueTimestamp = Date.parse(task.dueDate)
  return !Number.isNaN(dueTimestamp) && dueTimestamp < nowTimestamp
}