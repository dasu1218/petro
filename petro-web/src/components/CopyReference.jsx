import { useState } from 'react'
export default function CopyReference({ value, label, copiedMessage = 'Reference copied.' }) {
  const [result, setResult] = useState({ value: '', message: '' })
  const [busy, setBusy] = useState(false)
  const copy = async () => {
    setBusy(true)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setResult({ value, message: copiedMessage })
    } catch {
      setResult({ value, message: 'Could not copy automatically. Select and copy the reference above, or try again.' })
    } finally { setBusy(false) }
  }
  return <div className="reference-copy-control order-screen-actions"><button type="button" className="btn btn-secondary" onClick={copy} disabled={busy}>{busy ? 'Copying…' : label}</button><span role="status">{result.value === value ? result.message : ''}</span></div>
}
