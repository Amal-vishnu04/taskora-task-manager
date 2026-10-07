import { Check, LayoutDashboard, ListTodo, LogOut, Moon, Sun, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/useTheme'

function initials(user) {
  const source = user?.name || user?.email || 'TF'
  return source.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('')
}

export default function Sidebar({ user, menuOpen, onClose, onLogout }) {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const overviewActive = location.pathname === '/dashboard' && location.hash !== '#tasks'
  const tasksActive = location.pathname === '/dashboard' && location.hash === '#tasks'

  return (
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} aria-label="Workspace sidebar">
      <div className="sidebar-brand">
        <span className="brand-symbol"><Check size={17} strokeWidth={3} /></span>
        <span>TASKORA</span>
        <button className="icon-button sidebar-close" onClick={onClose} aria-label="Close navigation">
          <X size={19} />
        </button>
      </div>
      <p className="sidebar-tagline">Organize. Focus. Complete.</p>
      <p className="nav-label">WORKSPACE</p>
      <nav className="side-nav" aria-label="Main navigation">
        <Link to="/dashboard" className={`side-link ${overviewActive ? 'side-link-active' : ''}`} aria-current={overviewActive ? 'page' : undefined} onClick={onClose}>
          <LayoutDashboard size={18} /><span>Overview</span>
        </Link>
        <Link className={`side-link ${tasksActive ? 'side-link-active' : ''}`} to="/dashboard#tasks" aria-current={tasksActive ? 'page' : undefined} onClick={onClose}>
          <ListTodo size={18} /><span>Tasks</span>
        </Link>
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-note"><span className="note-dot" /><span>Focus on what matters.</span></div>
      <div className="sidebar-controls">
        <button
          className="theme-toggle sidebar-theme"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
      <div className="sidebar-user">
        <span className="avatar">{initials(user)}</span>
        <span className="sidebar-user-copy">
          <strong>{user?.name || 'Taskora member'}</strong>
          <small>{user?.email || 'Signed in'}</small>
        </span>
        <button className="icon-button logout-icon" onClick={onLogout} aria-label="Log out" title="Log out">
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  )
}