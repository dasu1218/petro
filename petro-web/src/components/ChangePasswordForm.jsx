import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { passwordChangeErrors } from '../lib/passwords.js'
export default function ChangePasswordForm() {
  const { changePassword } = useAuth()
  const navigate = useNavigate()
  const form = useRef(null)
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    const errors = passwordChangeErrors(values)
    setErrors(errors); setError('')
    if (Object.keys(errors).length) { form.current?.elements.namedItem(Object.keys(errors)[0])?.focus(); return }
    setBusy(true)
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      navigate('/login', { replace: true, state: { passwordChanged: true } })
    } catch (failure) { setError(failure.message); setBusy(false) }
  }
  return <form ref={form} onSubmit={submit} className="checkout-form password-change-form" noValidate><fieldset className="checkout-panel" disabled={busy}><legend>Change password</legend><p>Confirm your current password to set a new one. This signs you out and invalidates existing logins on all devices.</p><div className="checkout-fields">
    {[['currentPassword','Current password'],['newPassword','New password'],['confirmPassword','Confirm new password']].map(([key,label]) => <label className="form-field" key={key}><span>{label}</span><input type="password" name={key} autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'} required value={values[key]} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `password-${key}-error` : undefined} onChange={(event) => { setValues((current) => ({ ...current, [key]: event.target.value })); setErrors((current) => ({ ...current, [key]: undefined })) }} />{errors[key] && <small id={`password-${key}-error`} className="password-error">{errors[key]}</small>}</label>)}
  </div>{error && <p className="form-error" role="alert">{error}</p>}<p role="status">{busy ? 'Changing your password…' : ''}</p><button type="submit" className="btn btn-primary btn-large">Change password</button></fieldset></form>
}
