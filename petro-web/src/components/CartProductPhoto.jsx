import { useProducts } from '../context/productContext'
import ProductPhoto from './ProductPhoto'
export default function CartProductPhoto({ slug }) {
  const { products } = useProducts()
  const photo = products.find((product) => product.slug === slug)?.images?.[0]
  return photo ? <ProductPhoto src={photo.url} alt="" className="cart-product-photo" loading="lazy" decoding="async" width="80" height="80" /> : <span className="cart-photo-brand">PETRO</span>
}
