import { useState } from 'react'

const categories = ['Skin Care', 'Digestion', 'Flea & Tick', 'Nutrition', 'Bundles']

const products = [
  {
    name: 'Petal Cleanse Shampoo',
    price: 'LKR 2,450',
    tag: 'Vet Formulated',
    accent: 'rose',
    category: 'Skin Care',
  },
  {
    name: 'Omega Bites Plus',
    price: 'LKR 3,180',
    tag: 'Best Seller',
    accent: 'gold',
    category: 'Nutrition',
  },
  {
    name: 'Calm Coat Tonic',
    price: 'LKR 2,980',
    tag: 'New',
    accent: 'teal',
    category: 'Skin Care',
  },
]

const features = [
  {
    title: 'Clinically guided',
    text: 'Every formula is built around daily pet wellness and long-term skin support.',
  },
  {
    title: 'Fast local delivery',
    text: 'Order before 6PM and get trusted essentials to your doorstep in as little as 24 hours.',
  },
  {
    title: 'Pet-first care',
    text: 'We only stock products designed to support comfort, immunity, and healthy routines.',
  },
]

function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const visibleProducts = products.filter(
    (product) => selectedCategory === 'All' || product.category === selectedCategory,
  )

  return (
    <>
      <section className="hero-section" id="home">
        <div className="hero-copy">
          <span className="eyebrow">Vet-approved wellness</span>
          <h1>Healthy routines for happier pets.</h1>
          <p>
            Care kits, nutrition, and grooming essentials designed to keep your dog or cat
            comfy, active, and thriving every day.
          </p>

          <div className="cta-row">
              <a href="#shop" className="btn btn-primary btn-large">
              Shop best sellers
              </a>
              <a href="#bundles" className="btn btn-secondary btn-large">
              Explore bundles
              </a>
          </div>

          <div className="mini-stats" aria-label="Store metrics">
            <div>
              <strong>4.9/5</strong>
              <span>Average rating</span>
            </div>
            <div>
              <strong>12k+</strong>
              <span>Happy pets</span>
            </div>
            <div>
              <strong>2-day</strong>
              <span>Delivery</span>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Featured pet care products">
          <div className="floating-badge">Free shipping over LKR 4,500</div>
            <div className="product-showcase card-primary" id="bundles">
            <div className="product-image product-rose">
              <span>🐾</span>
            </div>
            <div className="product-meta">
              <span className="chip">Best Seller</span>
              <h2>Anti-Dermatitis Duo</h2>
              <div className="product-row">
                <strong>LKR 4,990</strong>
                <button type="button" className="btn btn-primary btn-small">
                  Add to cart
                </button>
              </div>
            </div>
          </div>

          <div className="info-row">
            <div className="mini-card">
              <span>98%</span>
              <small>Pet parent satisfaction</small>
            </div>
            <div className="mini-card accent-card">
              <span>New</span>
              <small>Glow + gut bundle</small>
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
            <a href="#shop" className="btn btn-secondary">
            View all products
            </a>
        </div>

          <div className="product-grid">
          {visibleProducts.map((product) => (
            <article key={product.name} className={`product-card product-${product.accent}`}>
              <div className="product-art">
                <span>{product.accent === 'rose' ? '🐶' : product.accent === 'gold' ? '🐱' : '✨'}</span>
              </div>
              <div className="product-info">
                <span className="chip">{product.tag}</span>
                <h3>{product.name}</h3>
                <div className="product-bottom">
                  <strong>{product.price}</strong>
                  <button type="button" className="icon-btn" aria-label={`Add ${product.name} to cart`}>
                    +
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
