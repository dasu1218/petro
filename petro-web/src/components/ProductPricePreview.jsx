import { productPricePreview } from '../lib/pricePreview.js'
import { formatLKR } from '../lib/format'
export default function ProductPricePreview({ prices, promotion }) {
  const preview = productPricePreview(prices, promotion)
  return <section className="product-price-preview" aria-label="Product price preview"><h3>Price preview</h3><p>{promotion.enabled ? 'Preview of prices while this discount is active. Save product to publish; your chosen dates control when it runs.' : 'Preview of your regular prices. Save product to publish.'}</p>
    {preview.error ? <p role="status" className="form-error">{preview.error}</p> : <div className="price-preview-scroll" role="region" aria-label="Scrollable price preview" tabIndex={0}><table><caption>Draft size prices</caption><thead><tr><th scope="col">Size</th><th scope="col">Regular price</th><th scope="col">Preview price</th><th scope="col">Saving</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th><td>{formatLKR(row.regularPrice)}</td><td><strong>{formatLKR(row.price)}</strong></td><td>{formatLKR(row.saving)}</td></tr>)}</tbody></table></div>}
  </section>
}
