import { useEffect, useState } from 'react'
import api, { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../api/axios'
import { AuthContext } from './contextValue'

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null')
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY))
  const [user, setUser] = useState(readStoredUser)

  function clearAuthentication() {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  useEffect(() => {
    const handleUnauthorized = () => clearAuthentication()
    window.addEventListener('taskflow:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('taskflow:unauthorized', handleUnauthorized)
  }, [])

  async function login(credentials) {
    const response = await api.post('/auth/login', credentials)
    const nextToken = response.data.token
    const nextUser = response.data.user || null
    if (!nextToken) throw new Error('The server did not return an access token')
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
    if (nextUser) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser))
    else localStorage.removeItem(USER_STORAGE_KEY)
    setToken(nextToken)
    setUser(nextUser)
    return response.data
  }

  async function register(details) {
    const response = await api.post('/auth/register', details)
    return response.data
  }

  function logout() {
    clearAuthentication()
  }

  const value = {
    login,
    register,
    logout,
    user,
    token,
    loading: false,
    isAuthenticated: Boolean(token),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}