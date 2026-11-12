import WishlistButton from '../components/WishlistButton'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/cartContext'
import { useProducts } from '../context/productContext'
import ProductStatus from '../components/ProductStatus'
import BundlesSection from '../components/BundlesSection'

const categories = ['Skin Care', 'Digestion', 'Flea & Tick', 'Nutrition', 'Bundles']

const features = [
  {
    title: 'Compare your options',
    text: 'Explore product descriptions, available sizes, and current prices before choosing.',
  },
  {
    title: 'Delivery choices',
    text: 'Choose standard or express delivery and review your delivery total at checkout.',
  },
  {
    title: 'Keep favourites close',
    text: 'Save products to your wishlist and return to them when you are ready to shop.',
  },
]

function HomePage() {
  const { products } = useProducts()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [justAddedSlug, setJustAddedSlug] = useState(null)
  const { addItem } = useCart()

  useEffect(() => {
    if (!justAddedSlug) {
      return
    }

    const timer = setTimeout(() => setJustAddedSlug(null), 1500)
    return () => clearTimeout(timer)
  }, [justAddedSlug])

  const handleQuickAdd = (product) => {
    const variant = product.variants.find((item) => item.stock > 0)

    if (!variant) {
      return
    }

    addItem(product, variant)
    setJustAddedSlug(product.slug)
  }
  const visibleProducts = products.filter(
    (product) => selectedCategory === 'All' || product.category === selectedCategory,
  )

  return (
    <>
      <section className="hero-section" id="home">
        <div className="hero-copy">
          <span className="eyebrow">Everyday pet care</span>
          <h1>Healthy routines for happier pets.</h1>
          <p>
            Care kits, nutrition, and grooming essentials designed to keep your dog or cat
            comfy, active, and thriving every day.
          </p>

          <div className="cta-row">
              <a href="#shop" className="btn btn-primary btn-large">
              Shop products
              </a>
              <a href="#care-bundles" className="btn btn-secondary btn-large">
              Explore bundles
              </a>
          </div>

          <div className="mini-stats" aria-label="Shopping features">
            <div>
              <strong>COD</strong>
              <span>Pay on delivery</span>
            </div>
            <div>
              <strong>Wishlist</strong>
              <span>Save your favourites</span>
            </div>
            <div>
              <strong>Bundles</strong>
              <span>Care, together</span>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Featured pet care products">
          <div className="floating-badge">Free standard delivery from LKR 4,500</div>
            <div className="product-showcase card-primary" id="bundles">
            <div className="product-image product-rose">
              <span>🐾</span>
            </div>
            <div className="product-meta">
              <span className="chip">Care bundles</span>
              <h2>Everyday Care Bundles</h2>
              <div className="product-row">
                <strong>Better together</strong>
                <Link to="/bundles" className="btn btn-primary btn-small">
                  View bundles
                </Link>
              </div>
            </div>
          </div>

          <div className="info-row">
            <div className="mini-card">
              <span>Sizes</span>
              <small>Choose your preferred size</small>
            </div>
            <div className="mini-card accent-card">
              <span>Reviews</span>
              <small>Read customer experiences</small>
            </div>
          </div>
        </div>
      </section>

      <section className="category-strip" aria-label="Categories">
        <button
          type="button"
          className="category-pill"
          aria-pressed={selectedCategory === 'All'}
          onClick={() => setSelectedCategory('All')}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            className="category-pill"
            aria-pressed={selectedCategory === category}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </section>

      <section className="showcase-section" id="shop">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow-muted">Featured picks</span>
            <h2>Care essentials for every routine.</h2>
          </div>
            <Link to="/shop" className="btn btn-secondary">View all products</Link>
        </div>

          <ProductStatus />
          <div className="product-grid">
          {visibleProducts.map((product) => (
            <article key={product.name} className={`product-card product-${product.accent}`}>
              <div className="product-art">
                <Link
                  to={`/products/${product.slug}`}
                  className="product-card-link"
                  aria-label={`View ${product.name}`}
                >
                  {product.images?.[0] ? <img src={product.images[0].url} alt={product.name} loading="lazy" decoding="async" width="300" height="220" className="catalog-photo" /> : <span>{product.packageType === 'bottle' ? '🐶' : '🐱'}</span>}
                </Link>
              </div>
              <div className="product-info">
                <span className="chip">{product.promotion?.label || product.badges[0]}</span>
                <WishlistButton slug={product.slug} />
                <h3>
                  <Link to={`/products/${product.slug}`} className="product-name-link">
                    {product.name}
                  </Link>
                </h3>
                <div className="product-bottom">
                  <div>{product.variants[0].regularPrice > product.variants[0].price && <del>LKR {product.variants[0].regularPrice.toLocaleString('en-LK')}</del>}<strong>LKR {product.variants[0].price.toLocaleString('en-LK')}</strong></div>
                  <button
                    type="button"
                    className={`icon-btn${justAddedSlug === product.slug ? ' is-added' : ''}`}
                    aria-label={`Add ${product.name} to cart`}
                    onClick={() => handleQuickAdd(product)}
                  >
                    {justAddedSlug === product.slug ? '✓' : '+'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
          {visibleProducts.length === 0 && (
            <p className="empty-products">No featured products in this category yet.</p>
          )}
      </section>

      <BundlesSection preview />

      <section className="feature-section" id="wellness">
        {features.map((feature) => (
          <article key={feature.title} className="feature-card">
            <div className="feature-icon">✓</div>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>
    </>
  )
}

export default HomePage
