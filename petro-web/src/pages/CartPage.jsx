import { Link } from 'react-router-dom'
import QuantityStepper from '../components/QuantityStepper'
import DeliveryProgress from '../components/DeliveryProgress'
import { FREE_DELIVERY_THRESHOLD, useCart } from '../context/cartContext'
import { formatLKR } from '../lib/format'
import { getCartItemPath } from '../lib/cart.js'

function CartPage() {
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <section className="page-panel page-center">
        <span className="eyebrow eyebrow-muted">Cart</span>
        <h1>Your cart is empty</h1>
        <p className="cart-empty-text">Add a few care essentials and they will show up here.</p>
        <Link to="/" className="btn btn-primary btn-large">
          Browse products
        </Link>
      </section>
    )
  }

  const remainingForFreeDelivery = Math.max(FREE_DELIVERY_THRESHOLD - subtotal, 0)

  return (
    <section className="page-panel">
      <div className="page-header">
        <span className="eyebrow eyebrow-muted">Cart</span>
        <h1>Your cart</h1>
        <p>
          {itemCount} {itemCount === 1 ? 'item' : 'items'} ready for checkout.
        </p>
      </div>

      <div className="cart-layout">
        <ul className="cart-lines" aria-label="Cart items">
          {items.map((item) => (
            <li key={item.key} className={`cart-line product-${item.accent}`}>
              <Link to={getCartItemPath(item)} className="cart-line-art" aria-hidden="true" tabIndex={-1}>
                PETRO
              </Link>

              <div className="cart-line-info">
                <Link to={getCartItemPath(item)} className="cart-line-name">
                  {item.name}
                </Link>
                <span className="cart-line-variant">
                  {item.variantLabel} · {formatLKR(item.price)} each
                </span>
                {item.quantity >= item.stock && (
                  <span className="cart-line-limit">Only {item.stock} in stock</span>
                )}
              </div>

              <QuantityStepper
                value={item.quantity}
                max={item.stock}
                label={`Quantity for ${item.name} ${item.variantLabel}`}
                onChange={(quantity) => updateQuantity(item.key, quantity)}
              />

              <strong className="cart-line-total">{formatLKR(item.price * item.quantity)}</strong>

              <button
                type="button"
                className="cart-line-remove"
                aria-label={`Remove ${item.name} ${item.variantLabel} from cart`}
                onClick={() => removeItem(item.key)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <aside className="cart-summary" aria-label="Order summary">
          <div className="cart-item">
            <span>Subtotal</span>
            <strong>{formatLKR(subtotal)}</strong>
          </div>
          <div className="cart-item">
            <span>Delivery</span>
            <strong>{remainingForFreeDelivery === 0 ? 'Free' : 'Calculated at checkout'}</strong>
          </div>
          <DeliveryProgress subtotal={subtotal} />
          <div className="cart-total">
            <span>Total before delivery</span>
            <strong>{formatLKR(subtotal)}</strong>
          </div>

          <Link to="/checkout" className="btn btn-primary btn-large cart-checkout">
            Continue to checkout
          </Link>
          <button type="button" className="cart-clear" onClick={clearCart}>
            Clear cart
          </button>
        </aside>
      </div>
    </section>
  )
}

export default CartPage
