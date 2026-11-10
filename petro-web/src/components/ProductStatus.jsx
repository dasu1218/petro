import { useProducts } from '../context/productContext'
export default function ProductStatus() {
  const { loading, error, reload } = useProducts()
  if (loading) return <p role="status">Loading products…</p>
  if (error) return <div role="alert"><p>{error}</p><button type="button" className="btn btn-secondary btn-large" onClick={reload}>Try again</button></div>
  return null
}
