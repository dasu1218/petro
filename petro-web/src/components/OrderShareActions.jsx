import { useState } from 'react'
import CopyReference from './CopyReference'
export default function OrderShareActions({ url, orderId }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const supported = typeof navigator.share === 'function'
  const share = async () => {
    setBusy(true); setMessage('')
    try {
      await navigator.share({ title: `Petro order ${orderId}`, url })
      setMessage('Order link shared.')
    } catch (error) {
      setMessage(error.name === 'AbortError' ? 'Sharing cancelled.' : 'Sharing is unavailable right now. Copy the order link instead.')
    } finally { setBusy(false) }
  }
  return <div className="order-share-actions order-screen-actions">
    {supported && <div><button type="button" className="btn btn-secondary" disabled={busy} onClick={share}>{busy ? 'Opening share options…' : 'Share order link'}</button><p role="status">{message}</p></div>}
    <CopyReference key={url} value={url} label="Copy order link" copiedMessage="Order link copied." />
  </div>
}
