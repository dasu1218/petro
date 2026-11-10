import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/cartContext'
import { apiRequest } from '../lib/api'
import { formatLKR } from '../lib/format'

function BundlesSection({ preview = false }) {
  const [result, setResult] = useState({ status: 'loading', bundles: [], error: '' })
  const [attempt, setAttempt] = useState(0)
  const [feedback, setFeedback] = useState('')
  const { addItem } = useCart()

  useEffect(() => {
    let ignore = false
    apiRequest('/bundles').then((data) => {
      if (!ignore) setResult({ status: 'ready', bundles: data.bundles, error: '' })
    }).catch((error) => {
      if (!ignore) setResult({ status: 'error', bundles: [], error: error.message })
    })
    return () => { ignore = true }
  }, [attempt])

  return (
    <section className="showcase-section bundles-section" id={preview ? 'care-bundles' : undefined} aria-label="Care bundles">
      {preview && (
        <div className="section-heading">
          <div><span className="eyebrow eyebrow-muted">Better together</span><h2>Care routines, bundled.</h2></div>
          <Link to="/bundles" className="btn btn-secondary">Explore bundles</Link>
        </div>
      )}
      {result.status === 'loading' && <p role="status">Loading care bundles…</p>}
      {result.status === 'error' && (
        <div className="bundle-state" role="alert">
          <p>We couldn't load the bundles. {result.error}</p>
          <button type="button" className="btn btn-secondary" onClick={() => {
            setResult({ status: 'loading', bundles: [], error: '' })
            setAttempt((value) => value + 1)
          }}>Try again</button>
        </div>
      )}
      {result.status === 'ready' && result.bundles.length === 0 && <p>No care bundles are available right now. Please check back soon.</p>}
      <div className="bundle-grid">
        {result.bundles.map((bundle) => {
          const variant = bundle.variants[0]
          return (
            <article key={bundle.slug} id={preview ? undefined : bundle.slug} className={`bundle-card product-${bundle.accent}`}>
              <div className="bundle-art" aria-hidden="true">
                <span className="bundle-package">PETRO<br /><small>CARE</small></span>
                <span className="bundle-package">PETRO<br /><small>DAILY</small></span>
              </div>
              <div className="bundle-info">
                <span className="chip">{bundle.savings > 0 ? `Save ${formatLKR(bundle.savings)}` : 'Care bundle'}</span>
                <h2>{bundle.name}</h2>
                <p>{bundle.description}</p>
                <ul className="bundle-contents" aria-label={`Included in ${bundle.name}`}>
                  {bundle.items.map((item) => <li key={`${item.slug}:${item.variantLabel}`}>{item.quantity} × {item.name} <span>({item.variantLabel})</span></li>)}
                </ul>
                <div className="bundle-price"><strong>{formatLKR(variant.price)}</strong>{bundle.savings > 0 && <span>Bought separately: <del>{formatLKR(bundle.regularPrice)}</del></span>}</div>
                <p className="bundle-stock">{variant.stock > 0 ? `${variant.stock} bundles available` : 'Currently out of stock'}</p>
                <button type="button" className="btn btn-primary btn-large" disabled={variant.stock <= 0} onClick={() => {
                  addItem(bundle, variant)
                  setFeedback(`${bundle.name} added to your cart.`)
                }}>{variant.stock > 0 ? 'Add bundle to cart' : 'Out of stock'}</button>
              </div>
            </article>
          )
        })}
      </div>
      <p className="bundle-feedback" role="status">{feedback}{feedback && <> <Link to="/cart">View cart</Link></>}</p>
    </section>
  )
}

export default BundlesSection
