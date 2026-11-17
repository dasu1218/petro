import { useEffect, useState } from 'react'
export default function OrderQrCode({ orderId }) {
  const url = new URL(`/orders/${encodeURIComponent(orderId)}`, window.location.origin).href
  const [result, setResult] = useState({ url: '', image: '', error: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let ignore = false
    import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(url, { width: 320, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#000000ff', light: '#ffffffff' } })).then((image) => {
      if (!ignore) setResult({ url, image, error: '' })
    }).catch(() => { if (!ignore) setResult({ url, image: '', error: 'The QR image could not be generated. You can still open the order link below.' }) })
    return () => { ignore = true }
  }, [url, attempt])
  const ready = result.url === url && result.image
  const error = result.url === url && result.error
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
  return <section className="checkout-panel order-qr-panel" aria-labelledby="order-qr-title">
    {ready ? <img className="order-qr-image" src={result.image} width="320" height="320" alt={`Scan to open order ${orderId}`} /> : <div className="order-qr-placeholder" role="status">{error ? 'QR unavailable' : 'Preparing your order QR code…'}</div>}
    <div className="order-qr-information"><h2 id="order-qr-title">Scan your order</h2><p>Scan with your phone’s camera to open order details and tracking. Sign in with the account that placed this order.</p>
      <a className="order-qr-link" href={url}>Open this order on Petro</a>
      {ready && <div className="order-screen-actions"><a className="btn btn-secondary" href={result.image} download={`petro-order-${orderId}.png`}>Download order QR</a></div>}
      {local && <p className="checkout-note order-screen-actions">For scanning on a phone, open Petro using its published website address or a network address your phone can reach.</p>}
      {error && <div role="alert"><p>{error}</p><button className="btn btn-secondary order-screen-actions" type="button" onClick={() => { setResult({ url: '', image: '', error: '' }); setAttempt((value) => value + 1) }}>Retry QR code</button></div>}
    </div>
  </section>
}
