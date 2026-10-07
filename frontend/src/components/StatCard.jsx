import { Check, CircleDashed, CircleDot, ListTodo } from 'lucide-react'

const icons = {
  total: ListTodo,
  pending: CircleDashed,
  in_progress: CircleDot,
  completed: Check,
}

export default function StatCard({ label, value, kind }) {
  const Icon = icons[kind]

  return (
    <article className={`stat-card stat-card-${kind}`}>
      <span className="stat-card-icon"><Icon size={18} strokeWidth={2} /></span>
      <span className="stat-card-copy"><span>{label}</span><strong>{value}</strong></span>
    </article>
  )
}