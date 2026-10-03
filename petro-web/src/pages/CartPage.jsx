function CartPage() {
  return (
    <section className="page-panel">
      <div className="page-header">
        <span className="eyebrow eyebrow-muted">Cart</span>
        <h1>Your cart is ready</h1>
      </div>
      <div className="cart-summary">
        <div className="cart-item">
          <span>Petal Cleanse Shampoo</span>
          <strong>LKR 2,450</strong>
        </div>
        <div className="cart-item">
          <span>Omega Bites Plus</span>
          <strong>LKR 3,180</strong>
        </div>
        <div className="cart-total">
          <span>Total</span>
          <strong>LKR 5,630</strong>
        </div>
      </div>
    </section>
  )
}

export default CartPage
