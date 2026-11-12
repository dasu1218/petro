import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useProducts } from '../context/productContext'
import { getPageMeta } from '../lib/pageMeta.js'
function setMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element) }
  element.setAttribute('content', content)
}
export default function PageMetadata() {
  const { pathname } = useLocation()
  const { products, loading, error } = useProducts()
  useEffect(() => {
    const meta = getPageMeta(pathname, products, !loading && !error)
    document.title = meta.title
    setMeta('name', 'description', meta.description)
    setMeta('name', 'robots', meta.indexable ? 'index,follow' : 'noindex,nofollow')
    setMeta('property', 'og:title', meta.title)
    setMeta('property', 'og:description', meta.description)
    setMeta('property', 'og:type', meta.type)
    setMeta('property', 'og:site_name', 'PETRO')
    const url = new URL(pathname, window.location.origin).href
    setMeta('property', 'og:url', url)
    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (meta.indexable) {
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
      canonical.href = url
    } else canonical?.remove()
  }, [pathname, products, loading, error])
  return null
}
