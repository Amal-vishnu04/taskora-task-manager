import { ArrowRight, ListTodo } from 'lucide-react'

export default function EmptyTasks({ onCreate }) {
  return (
    <section className="tasks-empty-state" aria-labelledby="empty-tasks-title">
      <span className="empty-state-icon"><ListTodo size={27} /></span>
      <h3 id="empty-tasks-title">Nothing on your board yet.</h3>
      <p>Create your first task and give your next priority a place to start.</p>
      <button className="primary-button" onClick={onCreate}>Create your first task <ArrowRight size={16} /></button>
    </section>
  )
}