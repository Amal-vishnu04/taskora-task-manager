import { useRef, useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../../api/errors'
import { useAuth } from '../../context/useAuth'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const navigate = useNavigate()
  const location = useLocation()
  const registrationNotice = location.state?.notice

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/.test(normalizedEmail)) {
      setError('Please enter a valid Gmail address.')
      return
    }

    if (!password) {
      setError('Enter your password.')
      return
    }

    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)

    try {
      await login({ email: normalizedEmail, password })
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to sign in. Please try again.'))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="auth-card-heading">
        <p className="eyebrow">YOUR WORKSPACE</p>
        <h2 id="login-title">Welcome to<br /><span>Taskora.</span></h2>
        <p className="auth-subtitle">Sign in and keep your priorities moving forward.</p>
      </div>
      {registrationNotice && <div className="notice-message" role="status">{registrationNotice}</div>}
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="field-label" htmlFor="login-email">Email address</label>
        <input id="login-email" className="text-input" type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={event => setEmail(event.target.value)} aria-describedby={error ? 'login-error' : undefined} />
        <div className="password-label-row">
          <label className="field-label" htmlFor="login-password">Password</label>
        </div>
        <div className="password-input-wrap">
          <input id="login-password" className="text-input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={event => setPassword(event.target.value)} aria-describedby={error ? 'login-error' : undefined} />
          <button className="password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {error && <p className="form-error" id="login-error" role="alert">{error}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={submitting}>
          <span>{submitting ? 'Signing in…' : 'Sign in'}</span><ArrowRight size={17} />
        </button>
      </form>
      <p className="auth-switch">New to Taskora? <Link to="/register">Create an account</Link></p>
    </section>
  )
}