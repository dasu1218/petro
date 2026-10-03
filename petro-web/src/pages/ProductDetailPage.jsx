import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import products from '../data/products'

const galleryViews = [
  { label: 'Product', kind: 'product' },
  { label: 'Formula', kind: 'formula' },
  { label: 'Size guide', kind: 'size' },
]

function ProductDetailPage() {
  const { slug } = useParams()
  const product = products.find((item) => item.slug === slug)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const [addedToCart, setAddedToCart] = useState(false)

  if (!product) {
    return (
      <section className="page-panel page-center">
        <span className="eyebrow eyebrow-muted">Product unavailable</span>
        <h1>We couldn't find that product.</h1>
        <Link to="/shop" className="btn btn-primary btn-large">
          Back to shop
        </Link>
      </section>
    )
  }

  const selectedVariant = product.variants[selectedVariantIndex]
  const activeGalleryView = galleryViews[activeGalleryIndex]

  return (
    <section className="product-detail page-panel">
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/shop">Shop</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="product-detail-layout">
        <div className="detail-gallery">
          <div
            className={`detail-gallery-main product-${product.accent} gallery-${activeGalleryView.kind}`}
            role="img"
            aria-label={`${product.name} ${activeGalleryView.label.toLowerCase()} view`}
          >
            {activeGalleryView.kind === 'formula' ? (
              <div className="formula-art">
                <span className="eyebrow eyebrow-muted">Made for daily care</span>
                <strong>{product.badges.join(' · ')}</strong>
                <span>{product.description}</span>
              </div>
            ) : (
              <div className={`package-art package-${product.packageType}`}>
                <span className="package-cap" aria-hidden="true" />
                <span className="package-brand">PETRO</span>
                <span className="package-rule" aria-hidden="true" />
                <strong>{product.name}</strong>
                <span className="package-category">{product.category} care</span>
                <span className="package-size">{selectedVariant.label}</span>
              </div>
            )}
          </div>

          <div className="detail-gallery-thumbnails" aria-label="Product gallery">
            {galleryViews.map((view, index) => (
              <button
                key={view.kind}
                type="button"
                className={`gallery-thumbnail product-${product.accent}${activeGalleryIndex === index ? ' is-active' : ''}`}
                aria-label={`Show ${view.label.toLowerCase()} view`}
                aria-pressed={activeGalleryIndex === index}
                onClick={() => setActiveGalleryIndex(index)}
              >
                <span className={`thumbnail-art thumbnail-${view.kind}`} aria-hidden="true">
                  {view.kind === 'product' ? 'PETRO' : view.kind === 'formula' ? 'CARE' : selectedVariant.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="detail-information">
          <span className="eyebrow eyebrow-muted">{product.category}</span>
          <h1>{product.name}</h1>
          <div className="product-rating" aria-label={`${product.rating} out of 5 from ${product.reviewCount} reviews`}>
            <strong>{product.rating} / 5</strong>
            <a href="#product-reviews">{product.reviewCount} reviews</a>
          </div>
          <p className="detail-description">{product.description}</p>

          <div className="detail-badges" aria-label="Product benefits">
            {product.badges.map((badge) => (
              <span className="chip" key={badge}>{badge}</span>
            ))}
          </div>

          <fieldset className="variant-selector">
            <legend>Choose size</legend>
            <div className="variant-options">
              {product.variants.map((variant, index) => (
                <button
                  key={variant.label}
                  type="button"
                  className="variant-option"
                  aria-pressed={selectedVariantIndex === index}
                  onClick={() => {
                    setSelectedVariantIndex(index)
                    setAddedToCart(false)
                  }}
                >
                  <span>{variant.label}</span>
                  <strong>LKR {variant.price.toLocaleString('en-LK')}</strong>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="detail-purchase-row">
            <div>
              <span className="detail-price-label">Price</span>
              <strong className="detail-price">LKR {selectedVariant.price.toLocaleString('en-LK')}</strong>
            </div>
            <span className="stock-status">
              {selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : 'Out of stock'}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-large detail-add-button"
            disabled={selectedVariant.stock === 0}
            onClick={() => setAddedToCart(true)}
          >
            {addedToCart ? 'Added to cart' : 'Add to cart'}
          </button>
          <p className="detail-cart-feedback" aria-live="polite">
            {addedToCart ? `${product.name} (${selectedVariant.label}) added to your cart.` : ''}
          </p>

          <div className="detail-delivery">
            <strong>Delivery across Sri Lanka</strong>
            <span>Orders over LKR 4,500 qualify for free delivery.</span>
          </div>
        </div>
      </div>

      <section className="detail-description-section" id="product-reviews">
        <span className="eyebrow eyebrow-muted">Product details</span>
        <h2>Thoughtful care, made simple.</h2>
        <p>{product.description} Select the size that best fits your pet's routine.</p>
      </section>
    </section>
  )
}

export default ProductDetailPage