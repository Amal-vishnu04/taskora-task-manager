import { useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, CalendarClock, Check, CircleDashed, ListTodo, Percent } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getAnalytics } from '../api/analytics'
import { getApiErrorMessage } from '../api/errors'

const STATUS_META = {
  pending: { label: 'Pending', color: '#d68910' },
  in_progress: { label: 'In Progress', color: '#2d6cdf' },
  completed: { label: 'Completed', color: '#1f9d55' },
}

const RANGE_OPTIONS = [7, 14, 30]

function formatDay(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day))
}

function formatDue(iso) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

function formatDueIn(iso, now) {
  const minutes = Math.round((Date.parse(iso) - now) / 60000)
  if (minutes < 60) return `in ${Math.max(minutes, 1)} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `in ${hours} hr`
  const days = Math.floor(hours / 24)
  return `in ${days} day${days === 1 ? '' : 's'}`
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  const title = label ?? payload[0].name
  return (
    <div className="an-tooltip">
      <strong>{title}</strong>
      <span>{payload[0].value} {unit}</span>
    </div>
  )
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <article className={`stat-card an-metric${tone ? ` an-metric-${tone}` : ''}`}>
      <span className="stat-card-icon"><Icon size={18} strokeWidth={2} /></span>
      <span className="stat-card-copy"><span>{label}</span><strong>{value}</strong></span>
    </article>
  )
}

export default function AnalyticsSection({ refreshKey, onOpenTask }) {
  const [days, setDays] = useState(14)
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState({ status: 'loading', data: null, error: '', loadedAt: 0 })

  useEffect(() => {
    let active = true
    getAnalytics({ days })
      .then(data => {
        if (active) setState({ status: 'ready', data, error: '', loadedAt: Date.now() })
      })
      .catch(requestError => {
        if (active) {
          setState(current => ({
            ...current,
            status: 'error',
            error: getApiErrorMessage(requestError, 'Analytics could not be loaded. Please try again.'),
          }))
        }
      })
    return () => { active = false }
  }, [days, refreshKey, reloadKey])

  function retry() {
    setState(current => ({ ...current, status: 'loading' }))
    setReloadKey(key => key + 1)
  }

  const { status, data, error, loadedAt } = state
  const distribution = data
    ? data.statusDistribution.map(item => ({
      key: item.status,
      name: STATUS_META[item.status]?.label || item.status,
      value: item.count,
      color: STATUS_META[item.status]?.color || '#888',
    }))
    : []
  const trend = data ? data.completedOverTime.map(item => ({ ...item, label: formatDay(item.date) })) : []
  const trendTotal = trend.reduce((sum, item) => sum + item.count, 0)

  return (
    <section className="analytics-section" id="analytics" aria-labelledby="analytics-heading">
      <div className="analytics-heading">
        <div>
          <p className="eyebrow">PRODUCTIVITY</p>
          <h2 id="analytics-heading">Analytics</h2>
        </div>
        <label className="filter-select-wrap">
          <span className="sr-only">Chart time range</span>
          <select aria-label="Chart time range" value={days} onChange={event => setDays(Number(event.target.value))}>
            {RANGE_OPTIONS.map(option => <option key={option} value={option}>Last {option} days</option>)}
          </select>
        </label>
      </div>

      {status === 'loading' && !data && <div className="task-state" role="status"><span className="loading-mark" /> Loading analytics…</div>}

      {status === 'error' && (
        <div className="task-error" role="alert">
          <AlertCircle size={19} /><span>{error}</span>
          <button className="secondary-button retry-button" onClick={retry}>Try again</button>
        </div>
      )}

      {data && data.total === 0 && (
        <div className="stat-card an-panel an-empty">
          <h3>No analytics yet</h3>
          <p>Create a few tasks and your progress will show up here.</p>
        </div>
      )}

      {data && data.total > 0 && (
        <>
          <div className="an-metrics">
            <Metric icon={ListTodo} label="Total" value={data.total} />
            <Metric icon={Check} label="Completed" value={data.completed} />
            <Metric icon={CircleDashed} label="Pending" value={data.pending} />
            <Metric icon={AlertTriangle} label="Overdue" value={data.overdue} tone={data.overdue > 0 ? 'danger' : ''} />
            <Metric icon={Percent} label="Completion" value={`${data.completionRate}%`} />
          </div>

          <div className="an-grid">
            <article className="stat-card an-panel">
              <h3 className="an-title">Tasks completed <span>last {days} days</span></h3>
              {trendTotal === 0 ? (
                <p className="an-note">No tasks completed in this period yet.</p>
              ) : (
                <div className="an-chart" role="img" aria-label="Bar chart of tasks completed per day">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} />
                      <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
                      <YAxis allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} content={<ChartTooltip unit="completed" />} />
                      <Bar dataKey="count" fill="#1f9d55" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>

            <article className="stat-card an-panel">
              <h3 className="an-title">Status distribution</h3>
              <div className="an-donut-wrap">
                <div className="an-chart an-donut" role="img" aria-label="Donut chart of tasks by status">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distribution} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none">
                        {distribution.map(item => <Cell key={item.key} fill={item.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip unit="tasks" />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="an-donut-center"><strong>{data.total}</strong><span>tasks</span></div>
                </div>
                <ul className="an-legend">
                  {distribution.map(item => (
                    <li key={item.key}>
                      <span className="an-swatch" style={{ background: item.color }} />
                      <span>{item.name}</span>
                      <strong>{item.value}</strong>
                      <small>{Math.round((item.value / data.total) * 100)}%</small>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>

          <article className="stat-card an-panel">
            <h3 className="an-title"><CalendarClock size={16} /> Upcoming deadlines</h3>
            {data.upcomingDeadlines.length === 0 ? (
              <p className="an-note">No upcoming deadlines. Add a due date to a task to see it here.</p>
            ) : (
              <ul className="an-deadlines">
                {data.upcomingDeadlines.map(task => (
                  <li key={task.id}>
                    <button type="button" onClick={() => onOpenTask?.(task.id)}>
                      <span className="an-deadline-title">{task.title}</span>
                      <span className="an-deadline-meta">{formatDue(task.dueDate)} · {formatDueIn(task.dueDate, loadedAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </>
      )}
    </section>
  )
}
