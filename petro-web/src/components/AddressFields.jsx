import { ADDRESS_FIELDS } from '../lib/checkout.js'

function AddressFields({ address, errors = {}, onChange, idPrefix = 'address' }) {
  return <div className="checkout-fields">
    {ADDRESS_FIELDS.map((field) => (
      <label key={field.name} className={`form-field${field.wide ? ' checkout-field-wide' : ''}`}>
        <span>{field.label}</span>
        <input name={field.name} type={field.type || 'text'} autoComplete={field.autoComplete}
          value={address[field.name]} required={!field.optional} maxLength={field.maxLength}
          aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `${idPrefix}-${field.name}-error` : undefined}
          onChange={(event) => onChange(field.name, event.target.value)} />
        {errors[field.name] && <small id={`${idPrefix}-${field.name}-error`} className="checkout-field-error">{errors[field.name]}</small>}
      </label>
    ))}
    <p className="checkout-country">Country: <strong>Sri Lanka</strong></p>
  </div>
}
export default AddressFields
