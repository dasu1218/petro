import { useId, useState } from 'react'
export default function PasswordField({ label, children, className = '', ...inputProps }) {
  const generatedId = useId()
  const id = inputProps.id || generatedId
  const [visible, setVisible] = useState(false)
  return <div className={`form-field ${className}`}><label htmlFor={id}><span>{label}</span></label><div className="password-input-control"><input {...inputProps} id={id} type={visible ? 'text' : 'password'} /><button type="button" aria-controls={id} aria-pressed={visible} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => setVisible((value) => !value)}>{visible ? 'Hide' : 'Show'}</button></div>{children}</div>
}
