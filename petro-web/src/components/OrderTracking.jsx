import { orderTimeline, safeTrackingUrl } from '../lib/orderTracking.js'
export default function OrderTracking({ order }) {
  const timeline = orderTimeline(order)
  const tracking = order.tracking
  const url = safeTrackingUrl(tracking?.url)
  const showTracking = order.status !== 'cancelled' && tracking?.carrier && tracking?.number
  return <section className="checkout-panel order-tracking" aria-labelledby="order-progress-title"><h2 id="order-progress-title">Order progress</h2>
    <ol className="order-timeline">{timeline.map((stage) => <li key={stage.status} className={stage.complete ? 'is-complete' : ''} aria-current={stage.current ? 'step' : undefined}><span className="timeline-dot" aria-hidden="true">{stage.complete ? '✓' : '○'}</span><div><strong>{stage.label}</strong><small>{stage.date ? <time dateTime={stage.date}>{new Date(stage.date).toLocaleString()}</time> : stage.complete ? 'Status recorded' : 'Not reached yet'}</small></div></li>)}</ol>
    {showTracking ? <div><h3>Courier details</h3><p>{tracking.carrier}<br />Tracking reference: <strong>{tracking.number}</strong></p>{url && <a href={url} target="_blank" rel="noopener noreferrer">Open courier tracking (new tab)</a>}<p className="checkout-note">Courier updates appear on the carrier’s tracking page. PETRO progress reflects updates recorded by the store.</p></div> : order.status !== 'cancelled' && <p>Courier tracking details will appear here when provided by the store.</p>}
  </section>
}
