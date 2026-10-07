import { useRef, useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../../api/errors'
import { useAuth } from '../../context/useAuth'

export default function Register() {
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const navigate = useNavigate()

  function updateField(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim()) return setError('Enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid email address.')
    if (form.password.length < 8) return setError('Use at least 8 characters for your password.')
    if (form.password !== form.confirmPassword) return setError('Your passwords do not match.')

    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      const notice = 'Your Taskora account is ready. Sign in to start organizing your work.'
      setSuccess(notice)
      navigate('/login', { replace: true, state: { notice } })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to create your account. Please try again.'))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-card register-card" aria-labelledby="register-title">
      <div className="auth-card-heading">
        <p className="eyebrow">ORGANIZE. FOCUS. COMPLETE.</p>
        <h2 id="register-title">Create your<br /><span>account.</span></h2>
        <p className="auth-subtitle">Create your Taskora workspace and keep every priority within reach.</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="field-label" htmlFor="register-name">Full name</label>
        <input id="register-name" className="text-input" name="name" autoComplete="name" placeholder="Your name" maxLength={100} required value={form.name} onChange={updateField} aria-describedby={error ? 'register-error' : undefined} />
        <label className="field-label" htmlFor="register-email">Email address</label>
        <input id="register-email" className="text-input" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={255} required value={form.email} onChange={updateField} aria-describedby={error ? 'register-error' : undefined} />
        <label className="field-label" htmlFor="register-password">Password</label>
        <div className="password-input-wrap">
          <input id="register-password" className="text-input" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="At least 8 characters" minLength={8} required value={form.password} onChange={updateField} aria-describedby={error ? 'register-error' : undefined} />
          <button className="password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <label className="field-label" htmlFor="register-confirm-password">Confirm password</label>
        <input id="register-confirm-password" className="text-input" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Re-enter your password" required value={form.confirmPassword} onChange={updateField} aria-describedby={error ? 'register-error' : undefined} />
        {error && <p className="form-error" id="register-error" role="alert">{error}</p>}
        {success && <p className="notice-message" role="status">{success}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={submitting}>
          <span>{submitting ? 'Creating account…' : 'Create account'}</span><ArrowRight size={17} />
        </button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </section>
  )
}