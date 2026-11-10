import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/cartContext'
import { formatLKR } from '../lib/format'
import { getCartItemPath } from '../lib/cart.js'
import DeliveryProgress from './DeliveryProgress'
import QuantityStepper from './QuantityStepper'

function CartDrawer({ open, onClose }) {
  const dialogRef = useRef(null)
  const { items, itemCount, subtotal, updateQuantity, removeItem } = useCart()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open) {
      dialog.close()
      return
    }

    dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="cart-drawer"
      aria-labelledby="cart-drawer-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect()
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
        }
      }}
    >
      <div className="cart-drawer-content">
        <header className="cart-drawer-header">
          <h2 id="cart-drawer-title">Your cart ({itemCount})</h2>
          <button type="button" className="cart-drawer-close" onClick={onClose} aria-label="Close cart" autoFocus>×</button>
        </header>
        {items.length === 0 ? (
          <div className="cart-drawer-empty">
            <h3>Your cart is empty</h3>
            <p>Find a few care essentials for your pet.</p>
            <Link to="/shop" className="btn btn-primary" onClick={onClose}>Browse products</Link>
          </div>
        ) : (
          <>
            <DeliveryProgress subtotal={subtotal} />
            <ul className="cart-lines cart-drawer-lines" aria-label="Cart items">
              {items.map((item) => (
                <li key={item.key} className={`cart-line product-${item.accent}`}>
                  <Link to={getCartItemPath(item)} className="cart-line-art" onClick={onClose} aria-hidden="true" tabIndex={-1}>PETRO</Link>
                  <div className="cart-line-info">
                    <Link to={getCartItemPath(item)} className="cart-line-name" onClick={onClose}>{item.name}</Link>
                    <span className="cart-line-variant">{item.variantLabel} · {formatLKR(item.price)} each</span>
                    {item.quantity >= item.stock && <span className="cart-line-limit">Only {item.stock} in stock</span>}
                    <QuantityStepper value={item.quantity} max={item.stock} label={`Quantity for ${item.name} ${item.variantLabel}`} onChange={(quantity) => updateQuantity(item.key, quantity)} />
                  </div>
                  <strong className="cart-line-total">{formatLKR(item.price * item.quantity)}</strong>
                  <button type="button" className="cart-line-remove" aria-label={`Remove ${item.name} ${item.variantLabel} from cart`} onClick={() => removeItem(item.key)}>Remove</button>
                </li>
              ))}
            </ul>
            <footer className="cart-drawer-footer">
              <div className="cart-item"><span>Subtotal</span><strong>{formatLKR(subtotal)}</strong></div>
              <p>Delivery is calculated at checkout.</p>
              <Link to="/checkout" className="btn btn-primary btn-large" onClick={onClose}>Continue to checkout</Link>
              <Link to="/cart" className="cart-clear" onClick={onClose}>View cart</Link>
              <button type="button" className="cart-clear" onClick={onClose}>Continue shopping</button>
            </footer>
          </>
        )}
      </div>
    </dialog>
  )
}

export default CartDrawer
