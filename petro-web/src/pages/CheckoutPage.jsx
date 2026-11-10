import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import DeliveryProgress from '../components/DeliveryProgress'
import { useAuth } from '../context/authContext'
import { useCart } from '../context/cartContext'
import { getCartItemPath } from '../lib/cart.js'
import { ADDRESS_FIELDS, DELIVERY_METHODS, getCheckoutFingerprint, getCheckoutTotals, validateCheckout } from '../lib/checkout.js'
import { formatLKR } from '../lib/format'
import { COD_LABEL, COD_METHOD } from '../lib/payment.js'

function CheckoutPage() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const { items, clearCart, beginOrder, endOrder } = useCart()
  const [orderError, setOrderError] = useState('')
  const [pendingOrder, setPendingOrder] = useState(null)
  const submitting = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [address, setAddress] = useState(() => Object.fromEntries(ADDRESS_FIELDS.map(({ name }) => [name, name === 'fullName' ? user.name : name === 'email' ? user.email : ''])))
  const [deliveryMethod, setDeliveryMethod] = useState('standard')
  const [paymentMethod, setPaymentMethod] = useState(COD_METHOD)
  const [errors, setErrors] = useState({})
  const [reviewFingerprint, setReviewFingerprint] = useState(null)
  const formRef = useRef(null)
  const reviewRef = useRef(null)
  const fingerprint = getCheckoutFingerprint(items, address, deliveryMethod, paymentMethod)
  const isReviewed = reviewFingerprint === fingerprint
  const totals = getCheckoutTotals(items, deliveryMethod)
  const method = DELIVERY_METHODS.find((entry) => entry.id === deliveryMethod)

  if (items.length === 0 && !pendingOrder) return (
    <section className="page-panel page-center">
      <span className="eyebrow eyebrow-muted">Checkout</span>
      <h1>Your cart is empty</h1>
      <p>Add care essentials before checking out.</p>
      <Link to="/shop" className="btn btn-primary btn-large">Browse products</Link>
    </section>
  )

  const reviewCheckout = (event) => {
    event.preventDefault()
    const validation = validateCheckout(address, deliveryMethod, paymentMethod)
    setErrors(validation.errors)
    if (Object.keys(validation.errors).length) {
      formRef.current?.elements.namedItem(Object.keys(validation.errors)[0])?.focus()
      return
    }
    setAddress(validation.address)
    setReviewFingerprint(getCheckoutFingerprint(items, validation.address, deliveryMethod, paymentMethod))
    requestAnimationFrame(() => reviewRef.current?.focus())
  }

  const submitOrder = async () => {
    if (submitting.current || (!isReviewed && !pendingOrder)) return
    if (!beginOrder()) return
    submitting.current = true
    setIsSubmitting(true)
    setOrderError('')
    const payload = pendingOrder || {
      requestId: crypto.randomUUID(),
      items: items.map(({ slug, variantLabel, quantity }) => ({ slug, variantLabel, quantity })),
      shippingAddress: address, deliveryMethod, paymentMethod, expectedTotal: totals.total,
    }
    setPendingOrder(payload)
    try {
      const data = await apiRequest('/orders', { method: 'POST', token, body: payload })
      endOrder()
      clearCart()
      navigate(`/orders/${data.order._id}`, { replace: true })
    } catch (error) {
      setOrderError(error.message)
      // An uncertain response must retry the same request ID and payload.
      if (error.status && error.status < 500) {
        setPendingOrder(null)
        setReviewFingerprint(null)
      }
    } finally {
      endOrder()
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page-panel checkout-page">
      <div className="page-header">
        <span className="eyebrow eyebrow-muted">Checkout</span>
        <h1>Care, delivered to your door.</h1>
        <p>Enter your delivery details and review your estimated total.</p>
        <Link to="/cart">Back to cart</Link>
      </div>
      <div className="checkout-layout">
        <div>
          {orderError && <p className="form-error" role="alert">{orderError}</p>}
          <form ref={formRef} className="checkout-form" onSubmit={reviewCheckout} noValidate>
            {Object.values(errors).some(Boolean) && <p className="form-error" role="alert">Check the highlighted delivery details before continuing.</p>}
            <fieldset className="checkout-panel" disabled={Boolean(pendingOrder)}>
              <legend>Delivery address</legend>
              <div className="checkout-fields">
                {ADDRESS_FIELDS.map((field) => (
                  <label key={field.name} className={`form-field${field.wide ? ' checkout-field-wide' : ''}`}>
                    <span>{field.label}</span>
                    <input name={field.name} type={field.type || 'text'} autoComplete={field.autoComplete}
                      value={address[field.name]} required={!field.optional} maxLength={field.maxLength}
                      aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
                      onChange={(event) => {
                        setAddress((current) => ({ ...current, [field.name]: event.target.value }))
                        setErrors((current) => ({ ...current, [field.name]: undefined }))
                      }} />
                    {errors[field.name] && <small id={`${field.name}-error`} className="checkout-field-error">{errors[field.name]}</small>}
                  </label>
                ))}
                <p className="checkout-country">Country: <strong>Sri Lanka</strong></p>
              </div>
            </fieldset>
            <fieldset className="checkout-panel" disabled={Boolean(pendingOrder)}>
              <legend>Delivery method</legend>
              <p className="checkout-note">Delivery fees are estimates and will be confirmed before an order is placed.</p>
              {DELIVERY_METHODS.map((option) => (
                <label key={option.id} className={`delivery-option${deliveryMethod === option.id ? ' is-selected' : ''}`}>
                  <input type="radio" name="deliveryMethod" value={option.id} checked={deliveryMethod === option.id} onChange={() => setDeliveryMethod(option.id)} />
                  <span><strong>{option.name}</strong><small>{option.description}</small></span>
                  <strong>{getCheckoutTotals(items, option.id).delivery === 0 ? 'Free' : formatLKR(option.fee)}</strong>
                </label>
              ))}
              {errors.deliveryMethod && <p role="alert" className="form-error">{errors.deliveryMethod}</p>}
            </fieldset>
            <fieldset className="checkout-panel" disabled={Boolean(pendingOrder)}>
              <legend>Payment method</legend>
              <label className="delivery-option is-selected">
                <input type="radio" name="paymentMethod" value={COD_METHOD} checked={paymentMethod === COD_METHOD} onChange={() => setPaymentMethod(COD_METHOD)} aria-describedby="cod-description" />
                <span><strong>{COD_LABEL}</strong><small id="cod-description">Pay the full order total in cash when your order is delivered. No online payment is required.</small></span>
              </label>
              {errors.paymentMethod && <p role="alert" className="form-error">{errors.paymentMethod}</p>}
            </fieldset>
            <button type="submit" className="btn btn-primary btn-large" disabled={Boolean(pendingOrder)}>Review checkout</button>
          </form>
          {isReviewed && (
            <section className="checkout-panel checkout-review" aria-labelledby="review-heading">
              <h2 id="review-heading" ref={reviewRef} tabIndex={-1}>Review your delivery</h2>
              <address>
                <strong>{address.fullName}</strong><br />
                {address.addressLine1}<br />
                {address.addressLine2 && <>{address.addressLine2}<br /></>}
                {address.city}, {address.postalCode}<br />Sri Lanka
              </address>
              <p>{address.email}<br />{address.phone}</p>
              <p>{method.name} · Estimated total: <strong>{formatLKR(totals.total)}</strong></p>
              <button type="button" className="btn btn-secondary" disabled={Boolean(pendingOrder)} onClick={() => {
                setReviewFingerprint(null)
                formRef.current?.elements.namedItem('fullName')?.focus()
              }}>Edit delivery details</button>
              <p className="checkout-payment-review"><strong>{COD_LABEL}</strong> · {formatLKR(totals.total)} due on delivery.</p>
            </section>
          )}
          {(isReviewed || pendingOrder) && (
            <section className="checkout-panel checkout-submit" aria-label="Place order">
              {pendingOrder && orderError && <p className="checkout-note">Retry the original order for {formatLKR(pendingOrder.expectedTotal)} to confirm its result. You can also <Link to="/orders">check your orders</Link> before retrying.</p>}
              <button type="button" className="btn btn-primary btn-large" disabled={isSubmitting} onClick={submitOrder}>{isSubmitting ? 'Placing order…' : pendingOrder ? 'Retry original order' : 'Place Cash on Delivery order'}</button>
              {!pendingOrder && <p className="checkout-note">Your order is saved when the confirmation page appears.</p>}
            </section>
          )}
        </div>
        <aside className="checkout-panel checkout-summary" aria-label="Order summary">
          <h2>Order summary</h2>
          <ul className="checkout-items">
            {items.map((item) => (
              <li key={item.key}>
                <div><Link to={getCartItemPath(item)}>{item.name}</Link><small>{item.variantLabel} · Qty {item.quantity}</small></div>
                <strong>{formatLKR(item.price * item.quantity)}</strong>
              </li>
            ))}
          </ul>
          <DeliveryProgress subtotal={totals.subtotal} />
          <dl className="checkout-totals" aria-live="polite">
            <div><dt>Subtotal</dt><dd>{formatLKR(totals.subtotal)}</dd></div>
            <div><dt>Estimated delivery</dt><dd>{totals.delivery === 0 ? 'Free' : formatLKR(totals.delivery)}</dd></div>
            <div className="checkout-grand-total"><dt>Estimated total</dt><dd>{formatLKR(totals.total)}</dd></div>
          </dl>
          <p className="checkout-note">{COD_LABEL}: pay the confirmed total on delivery. Prices and availability will be confirmed when placing your order.</p>
        </aside>
      </div>
    </section>
  )
}

export default CheckoutPage
