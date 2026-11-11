import { Link } from 'react-router-dom'
import { useWishlist } from '../context/wishlistContext'
import { useProducts } from '../context/productContext'
import ProductStatus from '../components/ProductStatus'
import WishlistButton from '../components/WishlistButton'
import { formatLKR } from '../lib/format'
export default function WishlistPage() {
  const wishlist = useWishlist()
  const catalog = useProducts()
  const products = catalog.products.filter((product) => wishlist.slugs.includes(product.slug))
  return <section className="page-panel"><div className="page-header"><span className="eyebrow eyebrow-muted">My wishlist</span><h1>Saved for your pet</h1><p>Saving a product does not reserve stock or lock its price.</p></div><ProductStatus />
    {wishlist.loading ? <p role="status">Loading wishlist…</p> : wishlist.error ? <div role="alert"><p>{wishlist.error}</p><button type="button" className="btn btn-secondary btn-large" onClick={wishlist.reload}>Try again</button></div> : <>
      {!catalog.loading && !catalog.error && products.length === 0 && <p>No saved products yet. <Link to="/shop">Explore the shop</Link>.</p>}
      <div className="product-grid">{products.map((product) => <article className="product-card" key={product.slug}>{product.images?.[0] && <img className="catalog-photo" src={product.images[0].url} alt={product.name} />}<div className="product-info"><h2><Link to={`/products/${product.slug}`}>{product.name}</Link></h2><p>From {formatLKR(product.variants[0].price)}</p><WishlistButton slug={product.slug} /></div></article>)}</div>
    </>}
  </section>
}
