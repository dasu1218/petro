import { Link } from 'react-router-dom'
import { useWishlist } from '../context/wishlistContext'
import { useProducts } from '../context/productContext'
import ProductStatus from '../components/ProductStatus'
import WishlistButton from '../components/WishlistButton'
import { formatLKR } from '../lib/format'
import { listingVariant } from '../lib/shop'
export default function WishlistPage() {
  const wishlist = useWishlist()
  const catalog = useProducts()
  const products = catalog.products.filter((product) => wishlist.slugs.includes(product.slug))
  const unavailable = !catalog.loading && !catalog.error ? wishlist.slugs.filter((slug) => !catalog.products.some((product) => product.slug === slug)) : []
  return <section className="page-panel"><div className="page-header"><span className="eyebrow eyebrow-muted">My wishlist</span><h1>Saved for your pet</h1><p>Saving a product does not reserve stock or lock its price.</p></div><ProductStatus />
    {wishlist.loading ? <p role="status">Loading wishlist…</p> : wishlist.error ? <div role="alert"><p>{wishlist.error}</p><button type="button" className="btn btn-secondary btn-large" onClick={wishlist.reload}>Try again</button></div> : <>
      {!catalog.loading && !catalog.error && products.length === 0 && <p>No available saved products. <Link to="/shop">Explore the shop</Link>.</p>}
      {unavailable.length > 0 && <section className="checkout-panel" aria-labelledby="unavailable-saved-heading"><h2 id="unavailable-saved-heading">Unavailable saved products</h2><p>These products remain saved and will reappear if restored. You can also remove them from your wishlist.</p><ul>{unavailable.map((slug) => <li key={slug}><p>Product URL: <strong>{slug}</strong></p><WishlistButton slug={slug} savedLabel={`Remove ${slug} from wishlist`} /></li>)}</ul></section>}
      <div className="product-grid">{products.map((product) => {
        const cheapest = listingVariant(product)
        const available = product.variants.some((variant) => variant.stock > 0)
        return <article className="product-card" key={product.slug}>{product.images?.[0] && <img loading="lazy" decoding="async" width="300" height="220" className="catalog-photo" src={product.images[0].url} alt={product.name} />}<div className="product-info"><h2><Link to={`/products/${product.slug}`}>{product.name}</Link></h2><p>From {formatLKR(cheapest.price)}</p>
          {product.promotion && <p className="chip">{product.promotion.label} · {product.promotion.percent}% off</p>}
          <p className="stock-status">{available ? 'Available sizes in stock' : 'Currently out of stock'}</p>
          <Link className="btn btn-secondary" to={`/products/${product.slug}`}>View sizes for {product.name}</Link><WishlistButton slug={product.slug} /></div></article>})}</div>
    </>}
  </section>
}
