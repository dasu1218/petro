import ProductPhoto from '../components/ProductPhoto'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QuantityStepper from '../components/QuantityStepper'
import { useCart } from '../context/cartContext'
import { useProducts } from '../context/productContext'
import ProductStatus from '../components/ProductStatus'
import ProductReviews from '../components/ProductReviews'
import WishlistButton from '../components/WishlistButton'

const galleryViews = [
  { label: 'Product', kind: 'product' },
  { label: 'Formula', kind: 'formula' },
  { label: 'Size guide', kind: 'size' },
]

function ProductDetailContent({ product }) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [selectedVariantLabel, setSelectedVariantLabel] = useState(() => (product?.variants.find((variant) => variant.stock > 0) || product?.variants[0])?.label)
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [addedQuantity, setAddedQuantity] = useState(0)
  const { addItem, items } = useCart()

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

  const selectedVariantIndex = Math.max(0, product.variants.findIndex((variant) => variant.label === selectedVariantLabel))
  const selectedVariant = product.variants[selectedVariantIndex]
  const cartQuantity = items.find((item) => item.slug === product.slug && item.variantLabel === selectedVariant.label)?.quantity || 0
  const remainingStock = Math.max(0, selectedVariant.stock - cartQuantity)
  const purchaseQuantity = Math.max(1, Math.min(quantity, remainingStock))
  const activeGalleryView = galleryViews[activeGalleryIndex]

  const chooseVariant = (index) => {
    setSelectedVariantLabel(product.variants[index].label)
    setQuantity(1)
    setAddedQuantity(0)
  }

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
            role={activeGalleryView.kind === 'size' ? 'region' : 'img'}
            aria-label={`${product.name} ${activeGalleryView.label.toLowerCase()} view`}
          >
            {activeGalleryView.kind === 'product' && product.images?.length ? <ProductPhoto className="detail-photo" src={product.images[photoIndex]?.url || product.images[0].url} alt={product.name} /> : activeGalleryView.kind === 'size' ? (
              <div className="product-size-guide"><table><caption>Sizes and availability</caption><thead><tr><th scope="col">Size</th><th scope="col">Price</th><th scope="col">Availability</th><th scope="col">Selection</th></tr></thead><tbody>{product.variants.map((variant, index) => <tr key={variant.label}><th scope="row">{variant.label}</th><td>{variant.regularPrice > variant.price && <del>LKR {variant.regularPrice.toLocaleString('en-LK')} </del>}LKR {variant.price.toLocaleString('en-LK')}</td><td>{variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}</td><td><button type="button" className="btn btn-secondary" disabled={variant.stock === 0} aria-pressed={selectedVariantIndex === index} aria-label={`Choose ${variant.label} from size guide`} onClick={() => chooseVariant(index)}>{selectedVariantIndex === index ? 'Selected' : 'Choose'}</button></td></tr>)}</tbody></table><p>Choose by pack size. For feeding or treatment amounts, follow the product label or your vet’s advice.</p></div>
            ) : activeGalleryView.kind === 'formula' ? (
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

          {product.images?.length > 1 && <div className="photo-thumbnails">{product.images.map((photo, index) => <button type="button" key={photo.publicId} aria-label={`Show photo ${index + 1}`} aria-pressed={photoIndex === index} onClick={() => { setPhotoIndex(index); setActiveGalleryIndex(0) }}><ProductPhoto src={photo.url} alt="" /></button>)}</div>}
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
          <a href="#product-reviews">Read customer reviews</a>
          <WishlistButton slug={product.slug} />
          {product.promotion && <p className="chip">{product.promotion.label} · {product.promotion.percent}% off</p>}
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
                  onClick={() => chooseVariant(index)}
                >
                  <span>{variant.label}</span>
                  {variant.stock === 0 && <small>Out of stock</small>}
                  <strong>LKR {variant.price.toLocaleString('en-LK')}</strong>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="detail-purchase-row">
            <div>
              <span className="detail-price-label">Price</span>
              {selectedVariant.regularPrice > selectedVariant.price && <del>LKR {selectedVariant.regularPrice.toLocaleString('en-LK')}</del>}
              <strong className="detail-price">LKR {selectedVariant.price.toLocaleString('en-LK')}</strong>
            </div>
            <span className="stock-status">
              {selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : 'Out of stock'}
            </span>
          </div>

          {cartQuantity > 0 && selectedVariant.stock > 0 && <p className="product-cart-stock" role="status">{remainingStock > 0 ? `${cartQuantity} already in your cart. You can add up to ${remainingStock} more.` : 'All available stock for this size is already in your cart.'}</p>}
          <div className="detail-add-row">
            {remainingStock > 0 && (
              <QuantityStepper
                value={purchaseQuantity}
                max={remainingStock}
                onChange={(nextQuantity) => {
                  setQuantity(nextQuantity)
                  setAddedQuantity(0)
                }}
              />
            )}
            <button
              type="button"
              className="btn btn-primary btn-large detail-add-button"
              disabled={remainingStock === 0}
              onClick={() => {
                addItem(product, selectedVariant, purchaseQuantity)
                setAddedQuantity(purchaseQuantity)
              }}
            >
              {selectedVariant.stock > 0 && remainingStock === 0 ? 'Already in your cart' : addedQuantity && cartQuantity > 0 ? 'Added to cart' : 'Add to cart'}
            </button>
          </div>
          <p className="detail-cart-feedback" aria-live="polite">
            {addedQuantity > 0 && cartQuantity > 0 && (
              <>
                {addedQuantity} × {product.name} ({selectedVariant.label}) added.{' '}
                <Link to="/cart">View cart</Link>
              </>
            )}
          </p>

          <div className="detail-delivery">
            <strong>Delivery across Sri Lanka</strong>
            <span>Orders over LKR 4,500 qualify for free delivery.</span>
          </div>
        </div>
      </div>

      <section className="detail-description-section">
        <span className="eyebrow eyebrow-muted">Product details</span>
        <h2>Thoughtful care, made simple.</h2>
        <p>{product.description} Select the size that best fits your pet's routine.</p>
      </section>
      <ProductReviews slug={product.slug} />
    </section>
  )
}

function ProductDetailPage() {
  const { slug } = useParams()
  const { products, loading, error } = useProducts()
  if (loading || error) return <section className="page-panel"><ProductStatus /></section>
  return <ProductDetailContent key={slug} product={products.find((item) => item.slug === slug)} />
}
export default ProductDetailPage