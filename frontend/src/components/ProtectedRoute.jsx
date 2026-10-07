import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import LoadingScreen from './LoadingScreen'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return children || <Outlet />
}

export function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children || <Outlet />
}