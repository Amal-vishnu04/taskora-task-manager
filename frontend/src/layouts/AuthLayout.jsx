import { ArrowUpRight, Check, CircleCheck } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Taskora overview">
        <Link className="brand brand-light" to="/login" aria-label="Taskora home">
          <span className="brand-symbol"><Check size={18} strokeWidth={3} /></span>
          <span>TASKORA</span>
        </Link>
        <div className="story-copy">
          <p className="eyebrow eyebrow-light">ORGANIZE. FOCUS. COMPLETE.</p>
          <h1>Turn ideas<br />into <em>action.</em></h1>
          <p className="story-description">A focused workspace for the work that matters.</p>
          <div className="story-proof"><CircleCheck size={17} /> Make progress feel effortless.</div>
        </div>
        <div className="story-bottom">
          <span>ORGANIZE. FOCUS. COMPLETE.</span>
          <ArrowUpRight size={16} />
        </div>
      </section>
      <section className="auth-main">
        <div className="auth-mobile-brand">
          <span className="brand-symbol"><Check size={18} strokeWidth={3} /></span>
          <span>TASKORA</span>
        </div>
        <Outlet />
        <p className="auth-legal">Organize. Focus. Complete.</p>
      </section>
    </main>
  )
}