import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
import { ProductContext } from './productContext'
const categories = { 'skin-care': 'Skin Care', nutrition: 'Nutrition', digestion: 'Digestion', 'flea-tick': 'Flea & Tick', bundles: 'Bundles' }
export default function ProductProvider({ children }) {
  const [result, setResult] = useState({ products: [], loading: true, error: '' })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    const timer = setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  useEffect(() => {
    let ignore = false
    apiRequest('/products').then(({ products }) => {
      if (!ignore) setResult({ products: products.map((product, index) => ({ ...product, category: categories[product.category] || product.category, accent: ['rose', 'gold', 'teal'][index % 3], packageType: index === 1 ? 'pouch' : 'bottle', reviewCount: product.numReviews || 0 })), loading: false, error: '' })
    }).catch((error) => { if (!ignore) setResult({ products: [], loading: false, error: error.message }) })
    return () => { ignore = true }
  }, [version])
  return <ProductContext.Provider value={{ ...result, reload: () => setVersion((value) => value + 1) }}>{children}</ProductContext.Provider>
}
