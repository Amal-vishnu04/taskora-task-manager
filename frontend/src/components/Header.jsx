import { Menu, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/useTheme'

function initials(user) {
  const source = user?.name || user?.email || 'TF'
  return source.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('')
}

export default function Header({ user, onOpenMenu }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="topbar">
      <button className="icon-button menu-toggle" onClick={onOpenMenu} aria-label="Open navigation">
        <Menu size={21} />
      </button>
      <div className="header-copy">
        <p className="header-kicker">TASKORA WORKSPACE</p>
        <h1>Good to see you, {user?.name?.trim().split(/\s+/)[0] || 'there'}.</h1>
        <p className="header-support">Keep your priorities moving forward.</p>
      </div>
      <div className="topbar-user">
        <span className="topbar-identity">
          <strong>{user?.name || 'Taskora member'}</strong>
          <small>{user?.email || 'Signed in'}</small>
        </span>
        <span className="avatar avatar-small" aria-hidden="true">{initials(user)}</span>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          <span className="theme-toggle-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </header>
  )
}