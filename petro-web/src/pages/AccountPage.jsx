import ChangePasswordForm from '../components/ChangePasswordForm'
import { useState } from 'react'
import AddressBook from '../components/AddressBook'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'

function AccountPage() {
  const { user, logout, updateProfile } = useAuth()
  const [details, setDetails] = useState({ name: user.name, email: user.email, currentPassword: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true); setError(''); setMessage('')
    try {
      const saved = await updateProfile(details)
      setDetails({ name: saved.name, email: saved.email, currentPassword: '' })
      setMessage('Profile updated.')
    } catch (failure) { setError(failure.message) } finally { setSaving(false) }
  }

  return (
    <section className="page-panel">
      <div className="page-header">
        <span className="eyebrow eyebrow-muted">My account</span>
        <h1>Hi, {user.name.split(' ')[0]}</h1>
        <p>Manage your details, delivery addresses, and orders.</p>
      </div>

      <form className="checkout-form profile-form" onSubmit={saveProfile}>
        <fieldset className="checkout-panel" disabled={saving}>
          <legend>Profile details</legend>
          {error && <p className="form-error" role="alert">{error}</p>}
          <p className="account-feedback" role="status">{saving ? 'Saving profile…' : message}</p>
          <div className="checkout-fields">
            <label className="form-field"><span>Name</span><input name="name" autoComplete="name" value={details.name} required maxLength={80} onChange={(event) => setDetails((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="form-field"><span>Email</span><input name="email" type="email" autoComplete="email" value={details.email} required maxLength={254} onChange={(event) => setDetails((current) => ({ ...current, email: event.target.value }))} /></label>
            {details.email.trim().toLowerCase() !== user.email && <label className="form-field checkout-field-wide"><span>Current password</span><input name="currentPassword" type="password" autoComplete="current-password" value={details.currentPassword} required aria-describedby="email-password-note" onChange={(event) => setDetails((current) => ({ ...current, currentPassword: event.target.value }))} /><small id="email-password-note">Confirm your current password to change your login email.</small></label>}
          </div>
          <p>Account type: <strong>{user.role === 'admin' ? 'Admin' : 'Customer'}</strong></p>
          <button type="submit" className="btn btn-primary btn-large">Save profile</button>
        </fieldset>
      </form>
      <ChangePasswordForm />
      <AddressBook />

      <div className="cta-row account-actions">
        <Link to="/orders" className="btn btn-primary btn-large">View orders</Link><Link to="/wishlist" className="btn btn-secondary btn-large">My wishlist</Link>
        {user.role === 'admin' && <Link to="/admin" className="btn btn-secondary btn-large">Admin dashboard</Link>}
        {user.role === 'admin' && <Link to="/admin/orders" className="btn btn-secondary btn-large">Manage orders</Link>}
        {user.role === 'admin' && <Link to="/admin/products" className="btn btn-secondary btn-large">Manage products</Link>}
        <button type="button" className="btn btn-secondary btn-large" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </section>
  )
}

export default AccountPage
