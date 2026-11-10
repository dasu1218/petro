import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'

const MIN_PASSWORD_LENGTH = 8

function RegisterPage() {
  const { register, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/account'

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      await register(form.name, form.email, form.password)
      navigate(redirectTo, { replace: true })
    } catch (requestError) {
      setError(requestError.message)
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page-panel auth-page">
      <div className="auth-card">
        <div className="page-header">
          <span className="eyebrow eyebrow-muted">Join PETRO</span>
          <h1>Create account</h1>
          <p>Save your pet's favourites and get faster checkout.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <label className="form-field">
            <span>Full name</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={updateField}
              required
            />
          </label>

          <label className="form-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField}
              required
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={form.password}
              onChange={updateField}
              required
            />
            <small>At least {MIN_PASSWORD_LENGTH} characters</small>
          </label>

          <label className="form-field">
            <span>Confirm password</span>
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={updateField}
              required
            />
          </label>

          <button type="submit" className="btn btn-primary btn-large" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" state={location.state}>
            Log in
          </Link>
        </p>
      </div>
    </section>
  )
}

export default RegisterPage
