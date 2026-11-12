import { useRef, useState } from 'react'
import { useAuth } from '../context/authContext'
import { checkoutAddress } from '../lib/addresses.js'
import { validateCheckout } from '../lib/checkout.js'
import AddressFields from './AddressFields'

function AddressBook() {
  const { user, saveAddress, deleteAddress, setDefaultAddress } = useAuth()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const formRef = useRef(null)
  const addresses = user.addresses || []
  const beginEdit = (saved) => {
    setEditing(saved?._id || 'new')
    setDraft({ ...checkoutAddress(saved, user), label: saved?.label || '', isDefault: saved ? String(saved._id) === String(user.defaultAddressId) : addresses.length === 0 })
    setErrors({}); setError(''); setMessage('')
    requestAnimationFrame(() => formRef.current?.elements.namedItem('label')?.focus())
  }
  const run = async (action, success) => {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { await action(); setMessage(success); return true } catch (failure) { setError(failure.message); return false } finally { setBusy(false) }
  }
  const submit = async (event) => {
    event.preventDefault()
    const validation = validateCheckout(draft, 'standard')
    if (!draft.label.trim() || draft.label.trim().length > 40) validation.errors.label = 'Enter a label of up to 40 characters.'
    setErrors(validation.errors)
    if (Object.keys(validation.errors).length) {
      formRef.current?.elements.namedItem(Object.keys(validation.errors)[0])?.focus()
      return
    }
    const ok = await run(() => saveAddress(editing === 'new' ? null : editing, { ...validation.address, label: draft.label.trim(), isDefault: draft.isDefault }), 'Address saved.')
    if (ok) { setEditing(null); setDraft(null) }
  }
  return <section className="account-addresses" aria-labelledby="address-book-title">
    <div className="section-heading"><div><h2 id="address-book-title">Saved addresses</h2><p>Save up to 10 delivery addresses.</p></div><button type="button" className="btn btn-secondary btn-large" disabled={busy || addresses.length >= 10} onClick={() => beginEdit(null)}>Add address</button></div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <p role="status" className="account-feedback">{busy ? 'Saving your address book…' : message}</p>
    {!addresses.length && <p>No saved addresses yet. Add one to make checkout faster.</p>}
    <ul className="address-grid">{addresses.map((address) => <li className="checkout-panel" key={address._id}>
      <h3>{address.label} {String(user.defaultAddressId) === String(address._id) && <span className="chip">Default</span>}</h3>
      <address className="order-address"><strong>{address.fullName}</strong><br />{address.addressLine1}<br />{address.addressLine2 && <>{address.addressLine2}<br /></>}{address.city}, {address.postalCode}<br />{address.country}</address><p>{address.phone}<br />{address.email}</p>
      <div className="address-actions"><button type="button" disabled={busy} onClick={() => beginEdit(address)}>Edit<span className="sr-only"> {address.label}</span></button><button type="button" disabled={busy} onClick={() => run(async () => { await deleteAddress(address._id); if (editing === address._id) { setEditing(null); setDraft(null) } }, 'Address deleted.')}>Delete<span className="sr-only"> {address.label}</span></button>{String(user.defaultAddressId) !== String(address._id) && <button type="button" disabled={busy} onClick={() => run(() => setDefaultAddress(address._id), 'Default address updated.')}>Make default<span className="sr-only">: {address.label}</span></button>}</div>
    </li>)}</ul>
    {draft && <form ref={formRef} className="checkout-form address-editor" onSubmit={submit} noValidate>
      <fieldset className="checkout-panel" disabled={busy}><legend>{editing === 'new' ? 'Add address' : 'Edit address'}</legend>
        {Object.values(errors).some(Boolean) && <p role="alert" className="form-error">Check the highlighted address details.</p>}
        <label className="form-field address-label"><span>Address label</span><input name="label" value={draft.label} maxLength={40} required aria-invalid={Boolean(errors.label)} aria-describedby={errors.label ? 'saved-label-error' : undefined} onChange={(event) => { setDraft((current) => ({ ...current, label: event.target.value })); setErrors((current) => ({ ...current, label: undefined })) }} />{errors.label && <small id="saved-label-error">{errors.label}</small>}</label>
        <AddressFields address={draft} errors={errors} idPrefix="saved" onChange={(name, value) => { setDraft((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: undefined })) }} />
        <label className="default-address-toggle"><input type="checkbox" disabled={addresses.length === 0 || editing === String(user.defaultAddressId)} checked={draft.isDefault} onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))} />Use as my default delivery address</label>
        <div className="cta-row"><button type="submit" className="btn btn-primary btn-large">Save address</button><button type="button" className="btn btn-secondary btn-large" onClick={() => { setEditing(null); setDraft(null); setErrors({}) }}>Cancel</button></div>
      </fieldset>
    </form>}
  </section>
}
export default AddressBook
