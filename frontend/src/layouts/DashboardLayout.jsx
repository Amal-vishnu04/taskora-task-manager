import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

export default function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} menuOpen={menuOpen} onClose={() => setMenuOpen(false)} onLogout={handleLogout} />
      {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <div className="dashboard-main">
        <Header user={user} onOpenMenu={() => setMenuOpen(true)} />
        <main className="dashboard-content"><Outlet /></main>
      </div>
    </div>
  )
}