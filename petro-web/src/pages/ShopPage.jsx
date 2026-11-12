import WishlistButton from '../components/WishlistButton'
import { Link, useSearchParams } from 'react-router-dom'
import { useProducts } from '../context/productContext'
import ProductStatus from '../components/ProductStatus'
import { formatLKR } from '../lib/format'
import { browseProducts, listingVariant, readShopFilters } from '../lib/shop.js'
export default function ShopPage() {
  const catalog = useProducts()
  const [params, setParams] = useSearchParams()
  const filters = readShopFilters(params)
  const result = browseProducts(catalog.products, filters)
  const categories = [...new Set(catalog.products.map((product) => product.category))].sort()
  const update = (key, value, replace = false) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value === '' || value === false) next.delete(key)
      else next.set(key, String(value))
      if (key !== 'page') next.delete('page')
      return next
    }, { replace, preventScrollReset: true })
  }
  const ready = !catalog.loading && !catalog.error
  return <section className="page-panel">
    <div className="page-header"><span className="eyebrow eyebrow-muted">Shop</span><h1>Pet care essentials</h1><p>Find the right care by category, price, and availability.</p></div>
    <form className="shop-filters checkout-panel" role="search" aria-label="Search and filter products" onSubmit={(event) => event.preventDefault()}>
      <label className="form-field shop-search"><span>Search products</span><input type="search" name="q" value={filters.query} maxLength={120} placeholder="Search names, care needs, or ingredients" onChange={(event) => update('q', event.target.value, true)} /></label>
      <label className="form-field"><span>Category</span><select value={filters.category} onChange={(event) => update('category', event.target.value)}><option value="">All categories</option>{filters.category && !categories.includes(filters.category) && <option value={filters.category}>{filters.category}</option>}{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
      <label className="form-field"><span>Sort by</span><select value={filters.sort} onChange={(event) => update('sort', event.target.value === 'featured' ? '' : event.target.value)}><option value="featured">Catalog order</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name: A–Z</option></select></label>
      <label className="form-field"><span>Minimum from price (LKR)</span><input type="number" min="0" max="99999999" step="1" value={filters.min ?? ''} onChange={(event) => update('min', event.target.value, true)} /></label>
      <label className="form-field"><span>Maximum from price (LKR)</span><input type="number" min="0" max="99999999" step="1" value={filters.max ?? ''} onChange={(event) => update('max', event.target.value, true)} aria-invalid={result.rangeError} aria-describedby={result.rangeError ? 'price-range-error' : undefined} /></label>
      <div className="shop-filter-options"><label><input type="checkbox" checked={filters.inStock} onChange={(event) => update('stock', event.target.checked ? '1' : '')} />In stock only</label><label><input type="checkbox" checked={filters.offersOnly} onChange={(event) => update('offers', event.target.checked ? '1' : '')} />Active promotions only</label><button type="button" className="btn btn-secondary" onClick={() => setParams({})}>Clear filters</button></div>
      {result.rangeError && <p id="price-range-error" className="form-error shop-filter-options" role="alert">Maximum price must be at least the minimum price.</p>}
    </form>
    <ProductStatus />
    {ready && <>
      <p role="status" className="shop-results">{result.total ? `Showing ${result.start + 1}–${result.start + result.products.length} of ${result.total} products` : 'No products match your filters.'}</p>
      {!result.total && <p>Try a different search or <button type="button" className="shop-reset" onClick={() => setParams({})}>clear your filters</button>.</p>}
      <div className="product-grid">{result.products.map((product) => {
        const variant = listingVariant(product, filters.inStock)
        const available = product.variants.some((entry) => entry.stock > 0)
        return <article className={`product-card product-${product.accent}`} key={product.slug}>
          <Link to={`/products/${product.slug}`} className="product-art">{product.images?.[0] ? <img loading="lazy" decoding="async" width="300" height="220" className="catalog-photo" src={product.images[0].url} alt={product.name} /> : <span>PETRO</span>}</Link>
          <div className="product-info">{product.promotion && <span className="chip">{product.promotion.label}</span>}<h2><Link to={`/products/${product.slug}`}>{product.name}</Link></h2>{variant.regularPrice > variant.price && <del>{formatLKR(variant.regularPrice)}</del>}<strong>From {formatLKR(variant.price)}</strong><p>{product.category} · {available ? 'In stock' : 'Out of stock'}</p><WishlistButton slug={product.slug} /></div>
        </article>
      })}</div>
      {result.pages > 1 && <nav className="shop-pagination" aria-label="Product pages"><button type="button" className="btn btn-secondary btn-large" disabled={result.page === 1} onClick={() => update('page', result.page - 1)}>Previous</button><span aria-current="page">Page {result.page} of {result.pages}</span><button type="button" className="btn btn-secondary btn-large" disabled={result.page === result.pages} onClick={() => update('page', result.page + 1)}>Next</button></nav>}
    </>}
  </section>
}
