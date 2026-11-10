import { Link } from 'react-router-dom'
import { useProducts } from '../context/productContext'
import ProductStatus from '../components/ProductStatus'
import { formatLKR } from '../lib/format'
export default function ShopPage() {
  const { products } = useProducts()
  return <section className="page-panel"><div className="page-header"><span className="eyebrow eyebrow-muted">Shop</span><h1>Pet care essentials</h1></div><ProductStatus /><div className="product-grid">{products.map((product) => <article className={`product-card product-${product.accent}`} key={product.slug}><Link to={`/products/${product.slug}`} className="product-art">{product.images?.[0] ? <img className="catalog-photo" src={product.images[0].url} alt={product.name} /> : <span>PETRO</span>}</Link><div className="product-info">{product.promotion && <span className="chip">{product.promotion.label}</span>}<h2><Link to={`/products/${product.slug}`}>{product.name}</Link></h2>{product.variants[0].regularPrice > product.variants[0].price && <del>{formatLKR(product.variants[0].regularPrice)}</del>}<strong>{formatLKR(product.variants[0].price)}</strong><p>{product.category}</p></div></article>)}</div></section>
}
