import { useState } from 'react'
export default function OrderTrackingEditor({ order, busy, onSave }) {
  const [draft, setDraft] = useState({ carrier: order.tracking?.carrier || '', number: order.tracking?.number || '', url: order.tracking?.url || '' })
  return <form className="checkout-panel tracking-editor" onSubmit={(event) => { event.preventDefault(); onSave(draft) }}><fieldset disabled={busy}><legend>Courier tracking</legend><p>Tracking details are visible to the customer. Saving them does not change the order status.</p><div className="checkout-fields">
    <label className="form-field"><span>Courier name</span><input required maxLength={80} value={draft.carrier} onChange={(event) => setDraft((current) => ({ ...current, carrier: event.target.value }))} /></label>
    <label className="form-field"><span>Tracking reference</span><input required maxLength={100} value={draft.number} onChange={(event) => setDraft((current) => ({ ...current, number: event.target.value }))} /></label>
    <label className="form-field checkout-field-wide"><span>HTTPS tracking link (optional)</span><input type="url" maxLength={2000} placeholder="https://" value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} /></label>
  </div><button type="submit" className="btn btn-secondary btn-large">Save tracking details</button></fieldset></form>
}
