export default function OrderProductPreview({ items = [] }) {
  if (!items.length) return null
  const count = items.reduce((total, item) => total + item.quantity, 0)
  return <div className="order-product-preview"><p>{count} {count === 1 ? 'item' : 'items'} purchased</p><ul aria-label="Purchased products">{items.slice(0, 3).map((item, index) => <li key={`${item.slug}:${item.variantLabel}:${index}`}><strong>{item.quantity} × {item.name}</strong><span>{item.variantLabel}</span></li>)}</ul>{items.length > 3 && <p className="order-preview-more">View order details for the full product list.</p>}</div>
}
